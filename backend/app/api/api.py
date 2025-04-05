from fastapi import APIRouter

from app.api.endpoints import (
    auth,
    users,
    content,
    transcription,
    ai_generation,
    reminders,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(content.router, prefix="/content", tags=["content"])
api_router.include_router(
    transcription.router, prefix="/transcription", tags=["transcription"]
)
api_router.include_router(ai_generation.router, prefix="/ai", tags=["ai-generation"])
api_router.include_router(reminders.router, prefix="/reminders", tags=["reminders"])
