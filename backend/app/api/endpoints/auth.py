from datetime import timedelta
from typing import Any
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm

from app import schemas
from app.core import security
from app.core.config import settings
from app.services import auth_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/login", response_model=schemas.Token)
def login_access_token(form_data: OAuth2PasswordRequestForm = Depends()) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    logger.info(f"Login attempt for user: {form_data.username}")
    user = auth_service.authenticate(
        email=form_data.username, password=form_data.password
    )
    if not user:
        logger.warning(f"Failed login attempt for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.info(f"Successful login for user: {form_data.username}")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user["id"], expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }


@router.post("/register", response_model=schemas.User)
def register_user(
    request: Request,
    user_in: schemas.UserCreate,
) -> Any:
    """
    Register a new user
    """
    logger.info(f"Received registration request with data: {user_in.json()}")

    user = auth_service.get_user_by_email(email=user_in.email)
    if user:
        logger.warning(
            f"Registration failed: User with email {user_in.email} already exists"
        )
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists",
        )

    try:
        new_user = auth_service.create_user(user_in=user_in)
        logger.info(f"Successfully registered user with email: {user_in.email}")
        return new_user
    except Exception as e:
        logger.error(f"Error during user registration: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Registration failed: {str(e)}",
        )
