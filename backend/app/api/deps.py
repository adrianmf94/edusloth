from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError

from app import schemas
from app.core import security
from app.core.config import settings
from app.services import auth_service

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


def get_current_user(token: str = Depends(reusable_oauth2)) -> schemas.User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user_dict = auth_service.get_user(user_id=token_data.sub)
    if not user_dict:
        raise HTTPException(status_code=404, detail="User not found")

    # Convert MongoDB document to User model
    user = schemas.User.from_mongo(user_dict)
    return user


def get_current_active_user(
    current_user: schemas.User = Depends(get_current_user),
) -> schemas.User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def get_current_active_superuser(
    current_user: schemas.User = Depends(get_current_user),
) -> schemas.User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user
