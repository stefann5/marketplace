from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ProductSummary(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    price: float
    categoryId: int | None = None
    imageUrls: list[str] = []
    averageRating: float = 0.0
    reviewCount: int = 0


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    productIds: list[UUID] = []
    createdAt: datetime


class ChatSessionSummary(BaseModel):
    id: str
    title: str
    createdAt: datetime
    updatedAt: datetime


class ChatSessionDetail(BaseModel):
    id: str
    title: str
    createdAt: datetime
    updatedAt: datetime
    messages: list[ChatMessage]


class SendMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


class SendMessageResponse(BaseModel):
    sessionId: str
    message: str
    products: list[ProductSummary]
