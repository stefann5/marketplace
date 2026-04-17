from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from bson import ObjectId

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
    user_ts = _utcnow()
    assistant_ts = _utcnow()
    user_entry = {"role": "user", "content": user_message, "productIds": [], "createdAt": user_ts}
    assistant_entry = {
        "role": "assistant",
        "content": assistant_message,
        "productIds": [str(pid) for pid in product_ids],
        "createdAt": assistant_ts,
    }
    update: dict[str, Any] = {
        "$push": {"messages": {"$each": [user_entry, assistant_entry]}},
        "$set": {"updatedAt": assistant_ts},
    }
    if new_title:
        update["$set"]["title"] = new_title
    await database().chat_sessions.update_one(
        {"_id": ObjectId(session_id), "userId": user_id}, update
    )


def history_to_openai_messages(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{"role": m["role"], "content": m["content"]} for m in messages]
