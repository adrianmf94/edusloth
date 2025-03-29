import os
import uuid
from datetime import datetime
from typing import List, Optional

import boto3
from fastapi import UploadFile

from app.core.config import settings
from app.db.session import content_collection, transcriptions_collection, generated_content_collection


# For local development, store files locally
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def create_content(
    user_id: str,
    title: str,
    content_type: str,
    file: UploadFile,
    description: Optional[str] = None,
) -> dict:
    """
    Create a new content entry and save the uploaded file.
    """
    # Generate unique ID for the content
    content_id = str(uuid.uuid4())
    
    # Extract file extension
    file_extension = os.path.splitext(file.filename)[1]
    file_path = f"{UPLOAD_DIR}/{content_id}{file_extension}"
    
    # For local development, save to local filesystem
    try:
        # Read file content
        file_content = await file.read()
        
        # Write to local file
        with open(file_path, "wb") as f:
            f.write(file_content)
    except Exception as e:
        print(f"Error saving file: {e}")
        return None
    
    # In production, would use S3
    # s3_client = boto3.client(
    #     's3',
    #     aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    #     aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    #     region_name=settings.AWS_REGION
    # )
    # s3_client.upload_fileobj(file, settings.S3_BUCKET, f"{user_id}/{content_id}{file_extension}")
    # file_path = f"s3://{settings.S3_BUCKET}/{user_id}/{content_id}{file_extension}"
    
    # Create content record
    content = {
        "id": content_id,
        "user_id": user_id,
        "title": title,
        "description": description,
        "content_type": content_type,
        "file_path": file_path,
        "created_at": datetime.utcnow(),
        "processed": False,
    }
    
    # Save to MongoDB
    content_collection.insert_one(content)
    
    return content


def get(id: str, user_id: str) -> Optional[dict]:
    """
    Get content by ID.
    """
    content = content_collection.find_one({"id": id, "user_id": user_id})
    
    if not content:
        return None
    
    # Get associated transcription
    transcription = None
    if content["content_type"] in ["audio", "video"]:
        transcription = transcriptions_collection.find_one({"content_id": id})
    
    # Get generated content
    generated_contents = list(generated_content_collection.find({"content_id": id}))
    
    # Prepare result
    content["transcription"] = transcription
    content["generated_contents"] = generated_contents
    
    return content


def get_multi_by_user(user_id: str, skip: int = 0, limit: int = 100) -> List[dict]:
    """
    Get multiple content entries for a user.
    """
    return list(
        content_collection.find({"user_id": user_id})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )


def remove(id: str, user_id: str) -> bool:
    """
    Delete content and associated data.
    """
    content = content_collection.find_one({"id": id, "user_id": user_id})
    
    if not content:
        return False
    
    # Delete file
    file_path = content["file_path"]
    try:
        if file_path.startswith("s3://"):
            # S3 file
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
            bucket, key = file_path.replace("s3://", "").split("/", 1)
            s3_client.delete_object(Bucket=bucket, Key=key)
        else:
            # Local file
            if os.path.exists(file_path):
                os.remove(file_path)
    except Exception as e:
        print(f"Error deleting file: {e}")
    
    # Delete from MongoDB
    content_collection.delete_one({"id": id})
    transcriptions_collection.delete_many({"content_id": id})
    generated_content_collection.delete_many({"content_id": id})
    
    return True 