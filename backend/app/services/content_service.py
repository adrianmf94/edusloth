import os
import uuid
from datetime import datetime
from typing import List, Optional

import boto3
from fastapi import UploadFile

from app.core.config import settings
from app.db.session import (
    content_collection,
    transcriptions_collection,
    generated_content_collection,
)

import logging

logger = logging.getLogger(__name__)

# For local development fallback if S3 fails
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def create_content(
    user_id: str,
    title: str,
    content_type: str,
    file: UploadFile,
    description: Optional[str] = None,
) -> Optional[dict]:
    """
    Create a new content entry and save the uploaded file to S3.
    """
    # Generate unique ID for the content
    content_id = str(uuid.uuid4())

    # Extract file extension
    file_extension = os.path.splitext(file.filename)[1]

    # Read file content
    file_content = await file.read()

    # Determine appropriate S3 bucket based on content type
    bucket_name = settings.S3_DOCUMENT_BUCKET
    if content_type == "audio":
        bucket_name = settings.S3_AUDIO_BUCKET

    # Create the S3 path: user_id/content_type/filename
    s3_key = f"{user_id}/{content_type}/{content_id}{file_extension}"
    file_path = None
    file_url = None

    # Try to upload to S3
    try:
        logger.info(f"Uploading to S3 bucket {bucket_name}, key: {s3_key}")

        s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )

        s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=file_content,
            ContentType=file.content_type,
        )

        # Generate S3 URL
        file_url = (
            f"https://{bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
        )
        file_path = f"s3://{bucket_name}/{s3_key}"

        logger.info(f"Successfully uploaded to S3: {file_url}")

    except Exception as e:
        logger.error(f"Error uploading to S3: {str(e)}")

        # Fallback to local storage if S3 fails
        local_path = f"{UPLOAD_DIR}/{content_id}{file_extension}"
        try:
            with open(local_path, "wb") as f:
                f.write(file_content)
            file_path = local_path
            logger.warning(f"Falling back to local storage: {file_path}")
        except Exception as local_err:
            logger.error(f"Error saving to local filesystem: {str(local_err)}")
            return None

    # Create content record
    content = {
        "id": content_id,
        "user_id": user_id,
        "title": title,
        "description": description,
        "content_type": content_type,
        "file_path": file_path,
        "file_url": file_url,
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
    content_bson = content_collection.find_one({"id": id, "user_id": user_id})

    if not content_bson:
        return None

    # Convert BSON to dict
    content = dict(content_bson)

    # If the file is in S3, generate a presigned URL for temporary access
    if content.get("file_path", "").startswith("s3://"):
        try:
            s3_client = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )

            # Extract bucket and key from the file path
            _, full_path = content["file_path"].split("s3://", 1)
            bucket_name, s3_key = full_path.split("/", 1)

            # Generate presigned URL valid for 1 hour
            presigned_url = s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket_name, "Key": s3_key},
                ExpiresIn=3600,  # 1 hour
            )

            content["access_url"] = presigned_url
        except Exception as e:
            logger.error(f"Error generating presigned URL: {str(e)}")

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
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )

            # Extract bucket and key from the file path
            _, full_path = file_path.split("s3://", 1)
            bucket_name, key = full_path.split("/", 1)

            # Delete the object
            s3_client.delete_object(Bucket=bucket_name, Key=key)
            logger.info(f"Deleted file from S3: {file_path}")
        else:
            # Local file
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Deleted local file: {file_path}")
    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")

    # Delete from MongoDB
    content_collection.delete_one({"id": id})
    transcriptions_collection.delete_many({"content_id": id})
    generated_content_collection.delete_many({"content_id": id})

    return True
