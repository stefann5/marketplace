import asyncio
import logging
from typing import Any

from app.catalog_client import catalog_client
from app.config import settings

log = logging.getLogger(__name__)


class CategoryCache:
    def __init__(self) -> None:
        self._formatted: str = ""
        self._task: asyncio.Task[None] | None = None

    @property
    def formatted_tree(self) -> str:
        return self._formatted

    async def refresh(self) -> bool:
        try:
            roots = await catalog_client.get_category_tree()
            lines: list[str] = []
            for root in roots:
                self._append(lines, root, [])
            self._formatted = "\n".join(lines)
            log.info("Refreshed category catalog (%d entries)", len(lines))
            return True
        except Exception as ex:
            log.warning("Failed to refresh category catalog: %s", ex)
            return False

    def _append(self, lines: list[str], node: dict[str, Any], path: list[str]) -> None:
        path.append(node.get("name", ""))
        lines.append(f"[{node['id']}] {' > '.join(path)}")
        for child in node.get("children") or []:
            self._append(lines, child, path)
        path.pop()

    async def start_refresh_loop(self) -> None:
        async def _loop() -> None:
            backoff = 2
            while not self._formatted:
                if await self.refresh():
                    break
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 30)
            while True:
                await asyncio.sleep(settings.category_refresh_minutes * 60)
                await self.refresh()

        self._task = asyncio.create_task(_loop())

    async def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            self._task = None


category_cache = CategoryCache()
