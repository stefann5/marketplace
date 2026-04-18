import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from openai import APIStatusError, RateLimitError

from app import repository
from app.auth import require_user
from app.config import settings
from app.llm_agent import llm_agent
from app.reranker import reranker
from app.models import (
    ChatSessionDetail,
    ChatSessionSummary,
    ProductSummary,
    SendMessageRequest,
    SendMessageResponse,
)

log = logging.getLogger(__name__)

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

    history = repository.history_to_openai_messages(session["messages"])

    try:
        message, product_ids, seen, is_fallback = await llm_agent.chat(history, body.message)
    except RateLimitError as ex:
        log.warning("LLM 429: %s", ex)
        raise HTTPException(
            status_code=429,
            detail="LLM rate limit reached. Please wait a moment and try again.",
        ) from ex
    except APIStatusError as ex:
        log.warning("LLM error %s: %s", ex.status_code, ex)
        raise HTTPException(status_code=502, detail=f"LLM error: {ex.message}") from ex
    except RuntimeError as ex:
        raise HTTPException(status_code=503, detail=str(ex)) from ex

    if is_fallback:
        new_title = body.message[:60] if not session["messages"] else None
        await repository.append_messages(
            session_id, user_id, body.message, message, [], new_title=new_title
        )
        return SendMessageResponse(sessionId=session_id, message=message, products=[])

    ordered_raw = [seen[pid] for pid in product_ids if pid in seen]
    ordered_raw = await _rerank(body.message, ordered_raw)
    ordered_raw = ordered_raw[: settings.reranker_top_k]
    final_ids = [UUID(p["id"]) for p in ordered_raw]
    products = [_to_summary(p) for p in ordered_raw]

    new_title = body.message[:60] if not session["messages"] else None
    await repository.append_messages(
        session_id, user_id, body.message, message, final_ids, new_title=new_title
    )

    return SendMessageResponse(sessionId=session_id, message=message, products=products)


async def _rerank(query: str, products: list[dict]) -> list[dict]:
    if not settings.reranker_enabled or not products:
        return products
    try:
        scores = await reranker.score(query, products)
    except Exception as ex:
        log.warning("Reranker failed, falling back to LLM order: %s", ex)
        return products
    paired = sorted(zip(scores, products), key=lambda x: x[0], reverse=True)
    top_score = paired[0][0] if paired else 0.0
    cutoff = top_score * settings.reranker_score_ratio
    log.info(
        "Reranker scores for %r (top %.4f, cutoff %.4f):\n%s",
        query,
        top_score,
        cutoff,
        "\n".join(
            f"  {score:.4f}  {'KEEP' if score >= cutoff else 'DROP'}  {p.get('name')}"
            for score, p in paired
        ),
    )
    return [p for score, p in paired if score >= cutoff]


def _to_summary(p: dict) -> ProductSummary:
    return ProductSummary(
        id=UUID(p["id"]),
        tenantId=str(p.get("tenantId", "")),
        name=p["name"],
        description=p.get("description"),
        price=float(p["price"]),
        stock=int(p.get("stock", 0)),
        categoryId=p.get("categoryId"),
        imageUrls=p.get("imageUrls", []),
        averageRating=float(p.get("averageRating", 0)),
        reviewCount=int(p.get("reviewCount", 0)),
    )
