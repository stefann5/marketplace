from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings


_client: AsyncIOMotorClient | None = None


async def connect() -> None:
    global _client
    _client = AsyncIOMotorClient(settings.mongodb_uri)
    db = _client.get_default_database()
    await db.chat_sessions.create_index([("userId", 1), ("updatedAt", -1)])


async def disconnect() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None


def database() -> AsyncIOMotorDatabase:
    assert _client is not None, "Mongo client not initialised"
    return _client.get_default_database()
