from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pymongo import MongoClient

from app.core.config import settings

engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# MongoDB connection
mongo_client = MongoClient(settings.MONGODB_URL)
mongo_db = mongo_client[settings.MONGODB_DB]

# Collections
users_collection = mongo_db["users"]
content_collection = mongo_db["content"]
transcriptions_collection = mongo_db["transcriptions"]
generated_content_collection = mongo_db["generated_content"]
reminders_collection = mongo_db["reminders"]
