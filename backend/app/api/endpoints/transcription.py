from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app import schemas
from app.api import deps
from app.services import transcription_service, content_service

router = APIRouter()


@router.post("/{content_id}/start", response_model=schemas.Message)
def start_transcription(
    *,
    background_tasks: BackgroundTasks,
    content_id: str,
    current_user: schemas.User = Depends(deps.get_current_user),
) -> Any:
    """
    Start the transcription process for an audio content.
    """
    # Check if content exists and belongs to the user
    content = content_service.get(id=content_id, user_id=current_user.id)
    if not content:
        raise HTTPException(
            status_code=404,
            detail="Content not found",
        )

    # Check if content is audio
    if content.content_type not in ["audio", "video"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content must be audio or video to transcribe",
        )

    # Check if transcription already exists
    existing = transcription_service.get_by_content(content_id=content_id)
    if existing and existing.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcription already exists for this content",
        )

    # Start transcription in background
    background_tasks.add_task(
        transcription_service.create_transcription,
        content_id=content_id,
        user_id=current_user.id,
    )

    return {"message": "Transcription started"}


@router.get("/{content_id}", response_model=schemas.Transcription)
def get_transcription(
    *,
    content_id: str,
    current_user: schemas.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get the transcription for a content.
    """
    # Check if content exists and belongs to the user
    content = content_service.get(id=content_id, user_id=current_user.id)
    if not content:
        raise HTTPException(
            status_code=404,
            detail="Content not found",
        )

    transcription = transcription_service.get_by_content(content_id=content_id)
    if not transcription:
        raise HTTPException(
            status_code=404,
            detail="Transcription not found",
        )

    return transcription
