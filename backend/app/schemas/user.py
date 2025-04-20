from typing import Optional, Any, List
from datetime import datetime

from pydantic import BaseModel, EmailStr, AnyHttpUrl, Field


# Shared properties
class UserBase(BaseModel):
    email: EmailStr
    is_active: bool = True
    is_superuser: bool = False
    full_name: Optional[str] = None
    education_level: Optional[str] = None
    study_interests: Optional[List[str]] = []
    profile_picture_url: Optional[AnyHttpUrl] = None


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str


# Properties to receive via API on update
class UserUpdate(BaseModel):  # Changed base to BaseModel for more control
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    education_level: Optional[str] = None
    study_interests: Optional[List[str]] = None
    profile_picture_url: Optional[AnyHttpUrl] = None


# Additional properties stored in DB
class UserInDB(UserBase):
    id: str = Field(..., alias="_id")  # Use alias for MongoDB compatibility
    hashed_password: str
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

    # Allow MongoDB _id to be mapped to id field
    @classmethod
    def from_mongo(cls, data: dict[str, Any]) -> "UserInDB":
        """
        Convert MongoDB document to UserInDB model.
        """
        if data and "_id" in data and "id" not in data:
            data["id"] = str(data["_id"])
        return cls(**data)


# Additional properties to return via API (output model)
class User(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

    # Map from UserInDB or MongoDB doc
    @classmethod
    def from_mongo(cls, data: dict[str, Any]) -> "User":
        """
        Convert MongoDB document to User model.
        Ensures both '_id' and 'id' are handled correctly.
        """
        if data and "_id" in data and "id" not in data:
            data["id"] = str(data["_id"])
        return cls(**data)
