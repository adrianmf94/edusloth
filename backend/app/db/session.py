from pymongo import MongoClient

from app.core.config import settings

# MongoDB connection
mongo_client = MongoClient(settings.MONGODB_URL)
mongo_db = mongo_client[settings.MONGODB_DB]

# Collections
users_collection = mongo_db["users"]
content_collection = mongo_db["content"]
transcriptions_collection = mongo_db["transcriptions"]
generated_content_collection = mongo_db["generated_content"]
reminders_collection = mongo_db["reminders"]
