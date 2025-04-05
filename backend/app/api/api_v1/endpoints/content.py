from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from fastapi.responses import JSONResponse
from typing import Optional, List, cast
from datetime import datetime
from pymongo import MongoClient
from app.core.config import settings
from app.api import deps
from app.models.user import User
from app.services.s3_service import S3Service

router = APIRouter()
s3_service = S3Service()

# Connect to MongoDB
client = MongoClient(settings.MONGODB_URL)
db = client[settings.MONGODB_DB]
content_collection = db["content"]


@router.post("/upload")
async def upload_content(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_user),
) -> JSONResponse:
    """
    Upload study content (documents, audio files, etc.)
    """
    try:
        # Upload file to S3
        file_info = await s3_service.upload_file(
            file=file, user_id=str(current_user.id)
        )

        # Create content record in MongoDB
        content_item = {
            "user_id": str(current_user.id),
            "title": title,
            "description": description,
            "original_filename": file.filename,
            "s3_path": file_info["s3_path"],
            "file_url": file_info["url"],
            "file_type": file_info["file_type"],
            "content_type": file_info["content_type"],
            "size": file_info["size"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "status": "active",
        }

        # Insert into MongoDB
        result = content_collection.insert_one(content_item)
        content_item["_id"] = str(result.inserted_id)

        return JSONResponse(
            status_code=200,
            content={
                "message": "Content uploaded successfully",
                "content": content_item,
            },
        )
    except Exception as e:
        # Log the error
        import logging

        logger = logging.getLogger("content_api")
        logger.error(f"Error in upload_content: {str(e)}")

        # Return a more helpful error message
        error_message = str(e)
        if "NoSuchBucket" in error_message:
            error_message = (
                "S3 bucket does not exist. Please check your infrastructure setup."
            )
        elif "AccessDenied" in error_message:
            error_message = "Access denied to S3 bucket. Please check your AWS credentials and permissions."
        elif "InvalidAccessKeyId" in error_message:
            error_message = "Invalid AWS access key. Please check your AWS credentials."
        elif "SignatureDoesNotMatch" in error_message:
            error_message = (
                "AWS signature verification failed. Please check your AWS secret key."
            )

        raise HTTPException(
            status_code=500, detail=f"Error uploading content: {error_message}"
        )


@router.get("/")
async def get_user_content(
    current_user: User = Depends(deps.get_current_user),
) -> List[dict]:
    """
    Get all content for the current user
    """
    user_content = list(content_collection.find({"user_id": str(current_user.id)}))

    # Convert MongoDB ObjectIDs to strings for JSON serialization
    for item in user_content:
        item["_id"] = str(item["_id"])

    return user_content


@router.get("/{content_id}")
async def get_content_by_id(
    content_id: str,
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    """
    Get specific content item by ID
    """
    from bson.objectid import ObjectId

    content_bson = content_collection.find_one(
        {"_id": ObjectId(content_id), "user_id": str(current_user.id)}
    )

    if not content_bson:
        raise HTTPException(status_code=404, detail="Content not found")

    # Convert BSON to dict
    content = dict(content_bson)

    # Generate a presigned URL for temporary access
    presigned_url = s3_service.generate_presigned_url(
        s3_path=content["s3_path"],
        bucket_name=(
            settings.S3_DOCUMENT_BUCKET
            if content["file_type"] != "audio"
            else settings.S3_AUDIO_BUCKET
        ),
    )

    content["_id"] = str(content["_id"])
    content["access_url"] = presigned_url

    # Cast the final dictionary object before returning
    return cast(dict, content)


@router.delete("/{content_id}")
async def delete_content(
    content_id: str,
    current_user: User = Depends(deps.get_current_user),
) -> JSONResponse:
    """
    Delete content by ID
    """
    from bson.objectid import ObjectId

    # Find the content first to get S3 path
    content = content_collection.find_one(
        {"_id": ObjectId(content_id), "user_id": str(current_user.id)}
    )

    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    # Delete from MongoDB
    result = content_collection.delete_one(
        {"_id": ObjectId(content_id), "user_id": str(current_user.id)}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404, detail="Content not found or already deleted"
        )

    # We're not deleting from S3 for now to avoid accidental deletions
    # S3 lifecycle policies can be used to manage file retention

    return JSONResponse(
        status_code=200, content={"message": "Content deleted successfully"}
    )
