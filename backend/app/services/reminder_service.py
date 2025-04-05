import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from app.db.session import reminders_collection


def create_reminder(
    user_id: str,
    content_id: Optional[str],
    description: str,
    due_date: datetime,
    priority: str = "medium",
) -> dict:
    """
    Create a new reminder.
    """
    reminder_id = str(uuid.uuid4())
    reminder = {
        "id": reminder_id,
        "user_id": user_id,
        "content_id": content_id,
        "description": description,
        "due_date": due_date,
        "priority": priority,
        "is_completed": False,
        "created_at": datetime.utcnow(),
    }

    reminders_collection.insert_one(reminder)
    return reminder


def get_reminder(reminder_id: str, user_id: str) -> Optional[dict]:
    """
    Get a reminder by ID.
    """
    result = reminders_collection.find_one({"id": reminder_id, "user_id": user_id})
    return dict(result) if result else None


def get_reminders_by_user(
    user_id: str,
    include_completed: bool = False,
    skip: int = 0,
    limit: int = 100,
) -> List[dict]:
    """
    Get reminders for a user.
    """
    query: Dict[str, Any] = {"user_id": user_id}
    if not include_completed:
        # Cast boolean to string for MongoDB query if needed
        query["is_completed"] = str(False)  # Assuming DB expects string

    return list(
        reminders_collection.find(query)
        .sort("due_date", 1)  # Sort by due date ascending
        .skip(skip)
        .limit(limit)
    )


def get_upcoming_reminders(user_id: str, days: int = 7) -> List[dict]:
    """
    Get upcoming reminders for a user within the specified number of days.
    """
    now = datetime.utcnow()
    end_date = now + timedelta(days=days)

    return list(
        reminders_collection.find(
            {
                "user_id": user_id,
                "is_completed": False,
                "due_date": {"$gte": now, "$lte": end_date},
            }
        ).sort("due_date", 1)
    )


def update_reminder(
    reminder_id: str,
    user_id: str,
    description: Optional[str] = None,
    due_date: Optional[datetime] = None,
    priority: Optional[str] = None,
    is_completed: Optional[bool] = None,
) -> Optional[dict]:
    """
    Update a reminder.
    """
    reminder = get_reminder(reminder_id=reminder_id, user_id=user_id)
    if not reminder:
        return None

    update_data: Dict[str, Any] = {}

    if description is not None:
        update_data["description"] = description

    if due_date is not None:
        # Cast datetime to string (ISO format) for MongoDB update if needed
        update_data["due_date"] = due_date.isoformat()

    if priority is not None:
        update_data["priority"] = priority

    if is_completed is not None:
        # Cast boolean to string for MongoDB update if needed
        update_data["is_completed"] = str(is_completed)

    if not update_data:
        return reminder

    # Cast datetime to string (ISO format) for MongoDB update if needed
    update_data["updated_at"] = datetime.utcnow().isoformat()

    reminders_collection.update_one(
        {"id": reminder_id, "user_id": user_id}, {"$set": update_data}
    )

    return get_reminder(reminder_id=reminder_id, user_id=user_id)


def delete_reminder(reminder_id: str, user_id: str) -> bool:
    """
    Delete a reminder.
    """
    result = reminders_collection.delete_one({"id": reminder_id, "user_id": user_id})
    return bool(result.deleted_count > 0)


def generate_auto_reminders_from_content(content_id: str, user_id: str) -> List[dict]:
    """
    Generate automatic reminders based on content.
    For the MVP, we'll just create a simple reminder for reviewing the content.
    In a full implementation, this would use AI to extract key dates and important information.
    """
    # Create a reminder to review the content in 3 days
    review_date = datetime.utcnow() + timedelta(days=3)
    reminder = create_reminder(
        user_id=user_id,
        content_id=content_id,
        description="Review this content to reinforce your learning",
        due_date=review_date,
        priority="medium",
    )

    # Create a follow-up reminder for a week later
    follow_up_date = datetime.utcnow() + timedelta(days=7)
    follow_up = create_reminder(
        user_id=user_id,
        content_id=content_id,
        description="Final review of this content",
        due_date=follow_up_date,
        priority="medium",
    )

    return [reminder, follow_up]
