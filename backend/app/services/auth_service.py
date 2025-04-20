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
    result = users_collection.find_one({"id": user_id})
    return dict(result) if result else None


def get_user_by_email(email: str) -> Optional[dict]:
    """
    Get a user by email.
    """
    result = users_collection.find_one({"email": email.lower()})
    return dict(result) if result else None


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


def create_user(user_in: UserCreate) -> Optional[dict]:
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
    new_user_data = {
        "_id": user_id,
        "email": user_in.email.lower(),
        "hashed_password": get_password_hash(user_in.password),
        "full_name": user_in.full_name,
        "education_level": user_in.education_level,
        "study_interests": user_in.study_interests,
        "profile_picture_url": (
            str(user_in.profile_picture_url) if user_in.profile_picture_url else None
        ),
        "is_active": True,
        "is_superuser": False,
        "created_at": datetime.utcnow(),
    }

    logger.info(f"Attempting to insert user with ID: {user_id}")
    try:
        # Save to MongoDB
        users_collection.insert_one(new_user_data)
        logger.info(f"Successfully created user with ID: {user_id}")
    except Exception as e:
        logger.error(f"Failed to create user in database: {str(e)}")
        raise

    # Prepare return data (matches User schema, excludes password)
    return_data = new_user_data.copy()
    return_data["id"] = return_data.pop("_id")
    del return_data["hashed_password"]
    return return_data


def update_user(user_id: str, user_in: UserUpdate) -> Optional[dict]:
    """
    Update a user.
    """
    user = get_user(user_id=user_id)
    if not user:
        return None

    # Prepare update data
    update_data = user_in.model_dump(exclude_unset=True)

    # Handle specific fields
    if "email" in update_data:
        update_data["email"] = update_data["email"].lower()

    if "password" in update_data and update_data["password"]:
        update_data["hashed_password"] = get_password_hash(update_data["password"])
        del update_data["password"]
    elif "password" in update_data:
        del update_data["password"]

    if "profile_picture_url" in update_data and update_data["profile_picture_url"]:
        update_data["profile_picture_url"] = str(update_data["profile_picture_url"])

    if not update_data:
        # No updates needed
        return user

    # Add updated timestamp
    update_data["updated_at"] = datetime.utcnow()

    # Update in MongoDB
    users_collection.update_one({"_id": user_id}, {"$set": update_data})

    # Get updated user data from DB
    updated_user_dict = users_collection.find_one({"_id": user_id})
    if updated_user_dict:
        # Convert to API model, ensuring _id is mapped to id and password excluded
        updated_user_dict["id"] = str(updated_user_dict.pop("_id"))
        if "hashed_password" in updated_user_dict:
            del updated_user_dict["hashed_password"]
        return updated_user_dict
    else:
        return None
