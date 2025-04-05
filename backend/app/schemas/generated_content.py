from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel


class FlashCard(BaseModel):
    question: str
    answer: str


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_option: int
    explanation: Optional[str] = None


class MindMapNode(BaseModel):
    id: str
    label: str
    children: List[str] = []


class GeneratedContent(BaseModel):
    id: str
    content_id: str
    type: str  # "summary", "flashcards", "quiz", "mindmap"
    status: str  # "pending", "processing", "completed", "failed"
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Dynamic content based on type
    summary: Optional[str] = None
    flashcards: Optional[List[FlashCard]] = None
    quiz: Optional[List[QuizQuestion]] = None
    mindmap: Optional[Dict[str, MindMapNode]] = None
    error: Optional[str] = None

    class Config:
        from_attributes = True
