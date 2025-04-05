from typing import Any, List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app import schemas
from app.api import deps
from app.services import ai_service, content_service, transcription_service

router = APIRouter()


@router.post("/generate/{content_id}/{generation_type}", response_model=schemas.Message)
def start_generation(
    *,
    background_tasks: BackgroundTasks,
    content_id: str,
    generation_type: str,
    current_user: schemas.User = Depends(deps.get_current_user),
) -> Any:
    """
    Start AI content generation for a given content.
    Generation types: summary, flashcards, quiz, mindmap
    """
    # Check if content exists and belongs to the user
    content = content_service.get(id=content_id, user_id=current_user.id)
    if not content:
        raise HTTPException(
            status_code=404,
            detail="Content not found",
        )

    # Validate generation type
    valid_types = ["summary", "flashcards", "quiz", "mindmap"]
    if generation_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid generation type. Must be one of: {', '.join(valid_types)}",
        )

    # For audio/video, check if transcription exists
    if content["content_type"] in ["audio", "video"]:
        transcription = transcription_service.get_by_content(content_id=content_id)
        if not transcription or transcription["status"] != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transcription must be completed before generating AI content",
            )

    # Start generation in background
    background_tasks.add_task(
        ai_service.start_generation,
        content_id=content_id,
        user_id=current_user.id,
        generation_type=generation_type,
    )

    return {"message": f"{generation_type.capitalize()} generation started"}


@router.get("/generated/{content_id}", response_model=List[schemas.GeneratedContent])
def get_generated_content(
    *,
    content_id: str,
    current_user: schemas.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get all generated content for a specific content.
    """
    # Check if content exists and belongs to the user
    content = content_service.get(id=content_id, user_id=current_user.id)
    if not content:
        raise HTTPException(
            status_code=404,
            detail="Content not found",
        )

    return ai_service.get_generated_content(content_id=content_id)


@router.get(
    "/generated/{content_id}/{generation_type}", response_model=schemas.GeneratedContent
)
def get_specific_generated_content(
    *,
    content_id: str,
    generation_type: str,
    current_user: schemas.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get specific generated content for a content.
    """
    # Check if content exists and belongs to the user
    content = content_service.get(id=content_id, user_id=current_user.id)
    if not content:
        raise HTTPException(
            status_code=404,
            detail="Content not found",
        )

    # Validate generation type
    valid_types = ["summary", "flashcards", "quiz", "mindmap"]
    if generation_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid generation type. Must be one of: {', '.join(valid_types)}",
        )

    result = ai_service.get_specific_generated_content(
        content_id=content_id, generation_type=generation_type
    )

    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"No {generation_type} found for this content",
        )

    return result
