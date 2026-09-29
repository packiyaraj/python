"""MongoDB connection helpers."""

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

from config import MONGODB_DATABASE, MONGODB_URI

_client: MongoClient | None = None


def get_database() -> Database:
    """Return the configured database, creating the client on first use."""
    global _client

    if not MONGODB_URI:
        raise RuntimeError(
            "MONGO_URL is missing. Set it in your .env file before using the API."
        )

    if _client is None:
        _client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)

    return _client[MONGODB_DATABASE]


def get_items_collection() -> Collection:
    """Return the collection used by the items API."""
    return get_database()["items"]


def close_mongo_connection() -> None:
    """Close the client when the application shuts down."""
    global _client

    if _client is not None:
        _client.close()
        _client = None
