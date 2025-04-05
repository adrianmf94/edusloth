import boto3
import os
import uuid
import logging
from typing import Optional
from botocore.exceptions import ClientError, NoCredentialsError, EndpointConnectionError
from fastapi import UploadFile
from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("s3_service")


class S3Service:
    def __init__(self) -> None:
        try:
            logger.info(f"Initializing S3 service with region: {settings.AWS_REGION}")
            logger.info(f"Using document bucket: {settings.S3_DOCUMENT_BUCKET}")
            logger.info(f"Using audio bucket: {settings.S3_AUDIO_BUCKET}")

            self.s3_client = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )
            self.document_bucket = settings.S3_DOCUMENT_BUCKET
            self.audio_bucket = settings.S3_AUDIO_BUCKET

            # Verify buckets exist
            self._verify_buckets()

        except Exception as e:
            logger.error(f"Error initializing S3 service: {str(e)}")
            raise

    def _verify_buckets(self) -> None:
        """Verify that the buckets exist and are accessible"""
        try:
            # List buckets and check if our buckets exist
            response = self.s3_client.list_buckets()
            buckets = [bucket["Name"] for bucket in response["Buckets"]]

            logger.info(f"Available S3 buckets: {buckets}")

            if self.document_bucket not in buckets:
                logger.warning(f"Document bucket {self.document_bucket} not found!")

            if self.audio_bucket not in buckets:
                logger.warning(f"Audio bucket {self.audio_bucket} not found!")

        except Exception as e:
            logger.error(f"Error verifying buckets: {str(e)}")

    async def upload_file(
        self, file: UploadFile, user_id: str, file_type: Optional[str] = None
    ) -> dict:
        """
        Upload a file to the appropriate S3 bucket based on file type

        Args:
            file: The file to upload
            user_id: User ID for organizing files
            file_type: Optional override for file type

        Returns:
            dict: Information about the uploaded file including URL
        """
        logger.info(f"Starting upload for file: {file.filename} by user: {user_id}")

        # Generate unique filename to prevent collisions
        file_extension = os.path.splitext(file.filename)[1].lower()
        unique_filename = f"{uuid.uuid4()}{file_extension}"

        # Determine file type if not provided
        if not file_type:
            if file_extension in [".pdf", ".doc", ".docx", ".txt", ".rtf"]:
                file_type = "document"
            elif file_extension in [".mp3", ".wav", ".m4a", ".ogg"]:
                file_type = "audio"
            elif file_extension in [".jpg", ".jpeg", ".png", ".gif"]:
                file_type = "image"
            else:
                file_type = "other"

        logger.info(f"Determined file type: {file_type}")

        # Select the appropriate bucket
        bucket_name = self.document_bucket
        if file_type == "audio":
            bucket_name = self.audio_bucket

        logger.info(f"Selected bucket: {bucket_name}")

        # Create the S3 path: user_id/file_type/filename
        s3_path = f"{user_id}/{file_type}/{unique_filename}"

        # Read file contents
        file_content = await file.read()
        logger.info(f"Read {len(file_content)} bytes from file")

        try:
            # Upload to S3
            logger.info(f"Uploading to S3 path: {s3_path}")
            self.s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_path,
                Body=file_content,
                ContentType=file.content_type,
            )

            # Generate URL
            url = f"https://{bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_path}"
            logger.info(f"File uploaded successfully. URL: {url}")

            return {
                "filename": file.filename,
                "unique_filename": unique_filename,
                "s3_path": s3_path,
                "url": url,
                "file_type": file_type,
                "content_type": file.content_type,
                "size": len(file_content),
            }

        except NoCredentialsError:
            error_msg = "AWS credentials not found or invalid"
            logger.error(error_msg)
            raise Exception(error_msg)
        except EndpointConnectionError:
            error_msg = f"Could not connect to S3 in region {settings.AWS_REGION}"
            logger.error(error_msg)
            raise Exception(error_msg)
        except ClientError as e:
            error_msg = f"Error uploading to S3: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"Unexpected error during upload: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
        finally:
            # Reset file pointer for potential further operations
            await file.seek(0)

    def generate_presigned_url(
        self, s3_path: str, bucket_name: Optional[str] = None, expiration: int = 3600
    ) -> Optional[str]:
        """
        Generate a presigned URL for accessing a file without making it public

        Args:
            s3_path: Path to the file in S3
            bucket_name: Bucket name (defaults to document bucket)
            expiration: URL expiration time in seconds (default 1 hour)

        Returns:
            str: Presigned URL for temporary access
        """
        if not bucket_name:
            bucket_name = self.document_bucket

        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket_name, "Key": s3_path},
                ExpiresIn=expiration,
            )
            return str(url)
        except Exception as e:
            logger.error(f"Error generating presigned URL: {str(e)}")
            return None
