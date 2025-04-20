from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "EduSloth Backend"
    API_V1_STR: str = "/api/v1"

    # Environment specific settings (e.g., loaded from .env)
    ENVIRONMENT: str = "development"
    SERVER_NAME: Optional[str] = None
    SERVER_HOST: Optional[str] = None

    # MongoDB
    MONGODB_URL: str
    MONGODB_DB: str

    # OpenAI API Key (Required for Whisper? Check usage)
    OPENAI_API_KEY: Optional[str] = None

    # Google AI
    GOOGLE_API_KEY: Optional[str] = None

    # Anthropic AI (Optional)
    ANTHROPIC_API_KEY: Optional[str] = None

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # CORS
    BACKEND_CORS_ORIGINS: str = "*"  # Adjust as needed for production

    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    S3_UPLOAD_BUCKET: str = "edusloth-dev-upload"
    S3_TRANSCRIPTION_BUCKET: str = "edusloth-dev-transcription"
    S3_AI_GENERATION_BUCKET: str = "edusloth-dev-ai-generation"
    S3_DOCUMENT_BUCKET: Optional[str] = None
    S3_AUDIO_BUCKET: Optional[str] = None

    # Removed PostgreSQL validator

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
