import uuid
from datetime import datetime
from typing import Optional
import logging

from app.core.security import get_password_hash, verify_password
from app.db.session import users_collection
from app.schemas.user import UserCreate, UserUpdate

logger = logging.getLogger(__name__)

def get_user(user_id: str) -> Optional[dict]:
    """
    Get a user by ID.
    """
    return users_collection.find_one({"id": user_id})


def get_user_by_email(email: str) -> Optional[dict]:
    """
    Get a user by email.
    """
    return users_collection.find_one({"email": email.lower()})


def authenticate(email: str, password: str) -> Optional[dict]:
    """
    Authenticate a user by email and password.
    """
    user = get_user_by_email(email=email)
    if not user:
        return None
    if not verify_password(password, user["hashed_password"]):
        return None
    return user


def create_user(user_in: UserCreate) -> dict:
    """
    Create a new user.
    """
    logger.info(f"Creating user with email: {user_in.email}")
    
    # Check if user already exists
    existing_user = get_user_by_email(email=user_in.email)
    if existing_user:
        logger.warning(f"User creation failed: Email {user_in.email} already exists")
        return None
    
    # Create user
    user_id = str(uuid.uuid4())
    new_user = {
        "id": user_id,
        "email": user_in.email.lower(),
        "hashed_password": get_password_hash(user_in.password),
        "full_name": user_in.full_name,
        "is_active": True,
        "is_superuser": False,
        "created_at": datetime.utcnow(),
    }
    
    logger.info(f"Attempting to insert user with ID: {user_id}")
    try:
        # Save to MongoDB
        users_collection.insert_one(new_user)
        logger.info(f"Successfully created user with ID: {user_id}")
    except Exception as e:
        logger.error(f"Failed to create user in database: {str(e)}")
        raise
    
    # Don't return the hashed password
    del new_user["hashed_password"]
    return new_user


def update_user(user_id: str, user_in: UserUpdate) -> Optional[dict]:
    """
    Update a user.
    """
    user = get_user(user_id=user_id)
    if not user:
        return None
    
    # Prepare update data
    update_data = {}
    
    if user_in.email:
        update_data["email"] = user_in.email.lower()
    
    if user_in.full_name:
        update_data["full_name"] = user_in.full_name
    
    if user_in.password:
        update_data["hashed_password"] = get_password_hash(user_in.password)
    
    if user_in.is_active is not None:
        update_data["is_active"] = user_in.is_active
    
    # Only allow superuser changes from a superuser (handled in endpoint)
    if user_in.is_superuser is not None:
        update_data["is_superuser"] = user_in.is_superuser
    
    if not update_data:
        # No updates needed
        return user
    
    # Add updated timestamp
    update_data["updated_at"] = datetime.utcnow()
    
    # Update in MongoDB
    users_collection.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    # Get updated user
    updated_user = get_user(user_id=user_id)
    return updated_user 