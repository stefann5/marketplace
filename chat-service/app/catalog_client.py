import logging
from typing import Any

import httpx

from app.config import settings

log = logging.getLogger(__name__)


class CatalogClient:
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(base_url=settings.catalog_service_url, timeout=10.0)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def get_category_tree(self) -> list[dict[str, Any]]:
        resp = await self._client.get("/api/categories")
        resp.raise_for_status()
        return resp.json()

    async def search_products(
        self,
        name: str | None = None,
        category_id: int | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        min_rating: float | None = None,
        sort_by: str | None = None,
        sort_direction: str | None = None,
        limit: int = 10,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {
            "page": 0,
            "size": max(1, min(limit, 20)),
            "sortBy": sort_by if sort_by in {"price", "rating", "date"} else "rating",
            "sortDirection": "asc" if sort_direction == "asc" else "desc",
        }
        if name:
            params["name"] = name
        if category_id is not None:
            params["categoryId"] = category_id
        if min_price is not None:
            params["minPrice"] = min_price
        if max_price is not None:
            params["maxPrice"] = max_price
        if min_rating is not None:
            params["minRating"] = min_rating

        resp = await self._client.get("/api/products", params=params)
        resp.raise_for_status()
        return resp.json()


catalog_client = CatalogClient()
