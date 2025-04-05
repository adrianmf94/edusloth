from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, Query

from app import schemas
from app.api import deps
from app.services import reminder_service, content_service

router = APIRouter()


@router.post("/", response_model=schemas.Reminder)
def create_reminder(
    *,
    reminder_in: schemas.ReminderCreate,
    current_user: schemas.User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a new reminder.
    """
    # If content_id provided, verify it exists and belongs to the user
    if reminder_in.content_id:
        content = content_service.get(
            id=reminder_in.content_id, user_id=current_user.id
        )
        if not content:
            raise HTTPException(
                status_code=404,
                detail="Content not found or does not belong to you",
            )

    return reminder_service.create_reminder(
        user_id=current_user.id,
        content_id=reminder_in.content_id,
        description=reminder_in.description,
        due_date=reminder_in.due_date,
        priority=reminder_in.priority,
    )


@router.get("/", response_model=List[schemas.Reminder])
def get_reminders(
    *,
    skip: int = 0,
    limit: int = 100,
    include_completed: bool = False,
    current_user: schemas.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get all reminders for the current user.
    """
    return reminder_service.get_reminders_by_user(
        user_id=current_user.id,
        include_completed=include_completed,
        skip=skip,
        limit=limit,
    )


@router.get("/upcoming", response_model=List[schemas.Reminder])
def get_upcoming_reminders(
    *,
    days: int = Query(7, ge=1, le=30),
    current_user: schemas.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get upcoming reminders for the next X days.
    """
    return reminder_service.get_upcoming_reminders(
        user_id=current_user.id,
        days=days,
    )


@router.get("/{reminder_id}", response_model=schemas.Reminder)
def get_reminder(
    *,
    reminder_id: str,
    current_user: schemas.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get a specific reminder.
    """
    reminder = reminder_service.get_reminder(
        reminder_id=reminder_id, user_id=current_user.id
    )
    if not reminder:
        raise HTTPException(
            status_code=404,
            detail="Reminder not found",
        )
    return reminder


@router.put("/{reminder_id}", response_model=schemas.Reminder)
def update_reminder(
    *,
    reminder_id: str,
    reminder_in: schemas.ReminderUpdate,
    current_user: schemas.User = Depends(deps.get_current_user),
) -> Any:
    """
    Update a reminder.
    """
    reminder = reminder_service.get_reminder(
        reminder_id=reminder_id, user_id=current_user.id
    )
    if not reminder:
        raise HTTPException(
            status_code=404,
            detail="Reminder not found",
        )

    updated_reminder = reminder_service.update_reminder(
        reminder_id=reminder_id,
        user_id=current_user.id,
        description=reminder_in.description,
        due_date=reminder_in.due_date,
        priority=reminder_in.priority,
        is_completed=reminder_in.is_completed,
    )

    return updated_reminder


@router.delete("/{reminder_id}", response_model=schemas.Message)
def delete_reminder(
    *,
    reminder_id: str,
    current_user: schemas.User = Depends(deps.get_current_user),
) -> Any:
    """
    Delete a reminder.
    """
    reminder = reminder_service.get_reminder(
        reminder_id=reminder_id, user_id=current_user.id
    )
    if not reminder:
        raise HTTPException(
            status_code=404,
            detail="Reminder not found",
        )

    reminder_service.delete_reminder(reminder_id=reminder_id, user_id=current_user.id)
    return {"message": "Reminder deleted"}
