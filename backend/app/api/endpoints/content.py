from typing import Any, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app import schemas
from app.api import deps
from app.services import content_service

router = APIRouter()


@router.post("/upload", response_model=schemas.Content)
async def upload_content(
    *,
    title: str = Form(...),
    content_type: str = Form(...),
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    current_user: schemas.User = Depends(deps.get_current_user),
) -> Any:
    """
    Upload a new content file (PDF, audio, etc.).
    """
    # Check file size and type
    content_size = 0
    file_content = await file.read()
    content_size = len(file_content)
    await file.seek(0)  # Reset file pointer

    if content_size > 100 * 1024 * 1024:  # 100MB limit
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large (max 100MB)",
        )

    # Process the upload
    result = await content_service.create_content(
        user_id=current_user.id,
        title=title,
        description=description,
        content_type=content_type,
        file=file,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload content",
        )

    return result


@router.get("/", response_model=List[schemas.Content])
def list_user_content(
    skip: int = 0,
    limit: int = 100,
    current_user: schemas.User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve all content for the current user.
    """
    return content_service.get_multi_by_user(
        user_id=current_user.id, skip=skip, limit=limit
    )


@router.get("/{content_id}", response_model=schemas.ContentDetail)
def get_content(
    *,
    content_id: str,
    current_user: schemas.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get content details by ID.
    """
    content = content_service.get(id=content_id, user_id=current_user.id)
    if not content:
        raise HTTPException(
            status_code=404,
            detail="Content not found",
        )
    return content


@router.delete("/{content_id}", response_model=schemas.Message)
def delete_content(
    *,
    content_id: str,
    current_user: schemas.User = Depends(deps.get_current_user),
) -> Any:
    """
    Delete content.
    """
    content = content_service.get(id=content_id, user_id=current_user.id)
    if not content:
        raise HTTPException(
            status_code=404,
            detail="Content not found",
        )
    content_service.remove(id=content_id, user_id=current_user.id)
    return {"message": "Content successfully deleted"}
