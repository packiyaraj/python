"""Application configuration loaded from environment variables and .env."""

import os

from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGO_URL") or os.getenv("MONGODB_URI")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "fastapi_mongodb")
