from typing import Optional, Any
from datetime import datetime

from pydantic import BaseModel, EmailStr


# Shared properties
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = True
    is_superuser: bool = False
    full_name: Optional[str] = None


# Properties to receive via API on creation
class UserCreate(UserBase):
    email: EmailStr
    password: str


# Properties to receive via API on update
class UserUpdate(UserBase):
    password: Optional[str] = None


# Additional properties to return via API
class User(UserBase):
    id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True

    # Allow MongoDB _id to be mapped to id field
    @classmethod
    def from_mongo(cls, data: dict[str, Any]) -> "User":
        """
        Convert MongoDB document to User model.
        Ensures both '_id' and 'id' are handled correctly.
        """
        if data and "_id" in data and "id" not in data:
            data["id"] = str(data["_id"])
        return cls(**data)
