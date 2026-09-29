"""Helpers for converting MongoDB documents into API responses."""

from typing import Any

from bson import ObjectId


def serialize_item(document: dict[str, Any]) -> dict[str, Any]:
    """Convert MongoDB's ObjectId into a JSON-friendly string ID."""
    return {
        "id": str(document["_id"]),
        "name": document["name"],
        "description": document.get("description"),
        "price": document["price"],
    }


def parse_item_id(item_id: str) -> ObjectId:
    """Convert a URL ID to ObjectId, rejecting malformed values."""
    if not ObjectId.is_valid(item_id):
        raise ValueError("Invalid item ID")
    return ObjectId(item_id)
