from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from .transcription import Transcription
from .generated_content import GeneratedContent


class ContentBase(BaseModel):
    title: str
    description: Optional[str] = None
    content_type: str  # e.g., "audio", "video", "pdf", "image"


# Additional properties stored in the database
class ContentInDB(ContentBase):
    id: str
    user_id: str
    created_at: datetime
    file_path: str
    processed: bool = False


# Properties to return via API
class Content(ContentBase):
    id: str
    created_at: datetime
    processed: bool

    class Config:
        from_attributes = True


# Detailed content with transcription and generated contents
class ContentDetail(Content):
    transcription: Optional[Transcription] = None
    generated_contents: List[GeneratedContent] = []

    class Config:
        from_attributes = True
