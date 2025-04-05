from typing import List

from app.db.session import users_collection


def get_multi(skip: int = 0, limit: int = 100) -> List[dict]:
    """
    Get multiple users.
    """
    return list(
        users_collection.find({}).sort("created_at", -1).skip(skip).limit(limit)
    )


def delete_user(user_id: str) -> bool:
    """
    Delete a user.
    """
    result = users_collection.delete_one({"id": user_id})
    return bool(result.deleted_count > 0)
