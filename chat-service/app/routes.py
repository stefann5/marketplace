from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app import repository
from app.auth import require_user
from app.catalog_client import catalog_client
from app.gemini_agent import gemini_agent
from app.models import (
    ChatSessionDetail,
    ChatSessionSummary,
    ProductSummary,
    SendMessageRequest,
    SendMessageResponse,
)

router = APIRouter(prefix="/api/chat")


@router.get("/sessions", response_model=list[ChatSessionSummary])
async def list_sessions(user_id: str = Depends(require_user)):
    return await repository.list_sessions(user_id)


@router.post("/sessions", response_model=ChatSessionDetail, status_code=status.HTTP_201_CREATED)
async def create_session(user_id: str = Depends(require_user)):
    return await repository.create_session(user_id, title="New chat")


@router.get("/sessions/{session_id}", response_model=ChatSessionDetail)
async def get_session(session_id: str, user_id: str = Depends(require_user)):
    session = await repository.get_session(session_id, user_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str, user_id: str = Depends(require_user)):
    deleted = await repository.delete_session(session_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")


@router.post("/sessions/{session_id}/messages", response_model=SendMessageResponse)
async def send_message(
    session_id: str,
    body: SendMessageRequest,
    user_id: str = Depends(require_user),
):
    session = await repository.get_session(session_id, user_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    history = repository.history_to_gemini_contents(session["messages"])

    try:
        message, product_ids, seen = await gemini_agent.chat(history, body.message)
    except RuntimeError as ex:
        raise HTTPException(status_code=503, detail=str(ex)) from ex

    products = [_to_summary(seen[pid]) for pid in product_ids if pid in seen]

    new_title = body.message[:60] if not session["messages"] else None
    await repository.append_messages(
        session_id, user_id, body.message, message, product_ids, new_title=new_title
    )

    return SendMessageResponse(sessionId=session_id, message=message, products=products)


def _to_summary(p: dict) -> ProductSummary:
    return ProductSummary(
        id=UUID(p["id"]),
        name=p["name"],
        description=p.get("description"),
        price=float(p["price"]),
        categoryId=p.get("categoryId"),
        imageUrls=p.get("imageUrls", []),
        averageRating=float(p.get("averageRating", 0)),
        reviewCount=int(p.get("reviewCount", 0)),
    )
