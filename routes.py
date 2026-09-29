"""CRUD routes for items."""

from typing import Any

from fastapi import APIRouter, HTTPException, Response, status
from pymongo.collection import Collection
from pymongo import ReturnDocument

from database import get_items_collection
from models import parse_item_id, serialize_item
from schemas import ItemCreate, ItemResponse, ItemUpdate

router = APIRouter(prefix="/items", tags=["items"])


def _get_item_id(item_id: str):
    try:
        return parse_item_id(item_id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


def _collection() -> Collection:
    try:
        return get_items_collection()
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.post("/", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(item: ItemCreate) -> dict[str, Any]:
    collection = _collection()
    result = collection.insert_one(item.model_dump())
    saved_item = collection.find_one({"_id": result.inserted_id})
    return serialize_item(saved_item)


@router.get("/", response_model=list[ItemResponse])
def list_items() -> list[dict[str, Any]]:
    return [serialize_item(item) for item in _collection().find()]


@router.get("/{item_id}", response_model=ItemResponse)
def get_item(item_id: str) -> dict[str, Any]:
    item = _collection().find_one({"_id": _get_item_id(item_id)})
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return serialize_item(item)


@router.patch("/{item_id}", response_model=ItemResponse)
def update_item(item_id: str, changes: ItemUpdate) -> dict[str, Any]:
    item = _collection().find_one_and_update(
        {"_id": _get_item_id(item_id)},
        {"$set": changes.model_dump(exclude_unset=True)},
        return_document=ReturnDocument.AFTER,
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return serialize_item(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: str) -> Response:
    result = _collection().delete_one({"_id": _get_item_id(item_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
