from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from bson import ObjectId
from google.genai import types

from app.db import database


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_session(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(doc["_id"]),
        "title": doc.get("title", "New chat"),
        "createdAt": doc["createdAt"],
        "updatedAt": doc["updatedAt"],
        "messages": doc.get("messages", []),
    }


async def create_session(user_id: str, title: str) -> dict[str, Any]:
    now = _utcnow()
    doc = {
        "userId": user_id,
        "title": title,
        "createdAt": now,
        "updatedAt": now,
        "messages": [],
    }
    result = await database().chat_sessions.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_session(doc)


async def list_sessions(user_id: str, limit: int = 50) -> list[dict[str, Any]]:
    cursor = (
        database()
        .chat_sessions.find({"userId": user_id}, {"messages": 0})
        .sort("updatedAt", -1)
        .limit(limit)
    )
    sessions = []
    async for doc in cursor:
        sessions.append(
            {
                "id": str(doc["_id"]),
                "title": doc.get("title", "New chat"),
                "createdAt": doc["createdAt"],
                "updatedAt": doc["updatedAt"],
            }
        )
    return sessions


async def get_session(session_id: str, user_id: str) -> dict[str, Any] | None:
    try:
        oid = ObjectId(session_id)
    except Exception:
        return None
    doc = await database().chat_sessions.find_one({"_id": oid, "userId": user_id})
    return _serialize_session(doc) if doc else None


async def delete_session(session_id: str, user_id: str) -> bool:
    try:
        oid = ObjectId(session_id)
    except Exception:
        return False
    result = await database().chat_sessions.delete_one({"_id": oid, "userId": user_id})
    return result.deleted_count > 0


async def append_messages(
    session_id: str,
    user_id: str,
    user_message: str,
    assistant_message: str,
    product_ids: list[UUID],
    new_title: str | None = None,
) -> None:
    now = _utcnow()
    user_entry = {"role": "user", "content": user_message, "productIds": [], "createdAt": now}
    assistant_entry = {
        "role": "assistant",
        "content": assistant_message,
        "productIds": [str(pid) for pid in product_ids],
        "createdAt": now,
    }
    update: dict[str, Any] = {
        "$push": {"messages": {"$each": [user_entry, assistant_entry]}},
        "$set": {"updatedAt": now},
    }
    if new_title:
        update["$set"]["title"] = new_title
    await database().chat_sessions.update_one(
        {"_id": ObjectId(session_id), "userId": user_id}, update
    )


def history_to_gemini_contents(messages: list[dict[str, Any]]) -> list[types.Content]:
    contents: list[types.Content] = []
    for m in messages:
        role = "user" if m["role"] == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=m["content"])]))
    return contents
