from typing import Any, List

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.encoders import jsonable_encoder

from app import schemas
from app.services import auth_service, user_service
from app.api import deps

router = APIRouter()


@router.get("/me", response_model=schemas.User)
def read_user_me(
    current_user: schemas.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user


@router.put("/me", response_model=schemas.User)
def update_user_me(
    *,
    user_in: schemas.UserUpdate,
    current_user: schemas.User = Depends(deps.get_current_user),
) -> Any:
    """
    Update own user.
    """
    return user_service.update_user(user_id=current_user.id, user_in=user_in)


@router.get("/{user_id}", response_model=schemas.User)
def read_user_by_id(
    user_id: str,
    current_user: schemas.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get a specific user by id.
    """
    user = user_service.get_user(user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    if user.id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=400, detail="Not enough permissions"
        )
    return user 