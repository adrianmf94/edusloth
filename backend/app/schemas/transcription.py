from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class TranscriptionSegment(BaseModel):
    start: float
    end: float
    text: str


class Transcription(BaseModel):
    id: str
    content_id: str
    status: str  # "pending", "processing", "completed", "failed"
    text: Optional[str] = None
    segments: List[TranscriptionSegment] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    error: Optional[str] = None

    class Config:
        from_attributes = True 