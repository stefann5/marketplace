import asyncio
import logging
from typing import Any

from sentence_transformers import CrossEncoder

from app.config import settings

log = logging.getLogger(__name__)


class Reranker:
    def __init__(self, model_name: str) -> None:
        self._model_name = model_name
        self._model: CrossEncoder | None = None
        self._load_lock = asyncio.Lock()

    async def _ensure_loaded(self) -> CrossEncoder:
        if self._model is None:
            async with self._load_lock:
                if self._model is None:
                    log.info("Loading reranker %s ...", self._model_name)
                    self._model = await asyncio.to_thread(
                        CrossEncoder, self._model_name, max_length=512
                    )
                    log.info("Reranker loaded")
        return self._model

    async def warm(self) -> None:
        try:
            await self._ensure_loaded()
        except Exception as ex:
            log.warning("Reranker warm-up failed: %s", ex)

    async def score(self, query: str, products: list[dict[str, Any]]) -> list[float]:
        if not products:
            return []
        model = await self._ensure_loaded()
        pairs = [[query, _product_text(p)] for p in products]
        scores = await asyncio.to_thread(model.predict, pairs)
        return [float(s) for s in scores]


def _product_text(p: dict[str, Any]) -> str:
    parts: list[str] = []
    name = p.get("name")
    if name:
        parts.append(str(name))
    description = p.get("description")
    if description:
        parts.append(str(description)[:500])
    return " — ".join(parts) if parts else ""


reranker = Reranker(settings.reranker_model)
