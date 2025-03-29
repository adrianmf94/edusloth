from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ReminderBase(BaseModel):
    description: str
    due_date: datetime
    priority: str = "medium"  # low, medium, high
    content_id: Optional[str] = None


class ReminderCreate(ReminderBase):
    pass


class ReminderUpdate(BaseModel):
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[str] = None
    is_completed: Optional[bool] = None


class Reminder(ReminderBase):
    id: str
    user_id: str
    is_completed: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True 