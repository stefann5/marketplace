import asyncio
import logging
from typing import Any

from app.catalog_client import catalog_client
from app.config import settings

log = logging.getLogger(__name__)


def _normalize(s: str) -> str:
    return " ".join(s.lower().replace(">", " > ").split())


class CategoryCache:
    def __init__(self) -> None:
        self._formatted: str = ""
        self._lookup: dict[str, int] = {}
        self._all_paths: list[str] = []
        self._task: asyncio.Task[None] | None = None

    @property
    def formatted_tree(self) -> str:
        return self._formatted

    def resolve(self, query: str | None) -> int | None:
        if not query:
            return None
        return self._lookup.get(_normalize(query))

    @property
    def all_paths(self) -> list[str]:
        return list(self._all_paths)

    async def refresh(self) -> bool:
        try:
            roots = await catalog_client.get_category_tree()
            lines: list[str] = []
            lookup: dict[str, int] = {}
            paths: list[str] = []
            for root in roots:
                self._walk(lines, lookup, paths, root, [])
            self._formatted = "\n".join(lines)
            self._lookup = lookup
            self._all_paths = paths
            log.info("Refreshed category catalog (%d entries)", len(lines))
            return True
        except Exception as ex:
            log.warning("Failed to refresh category catalog: %s", ex)
            return False

    def _walk(
        self,
        lines: list[str],
        lookup: dict[str, int],
        paths: list[str],
        node: dict[str, Any],
        path: list[str],
    ) -> None:
        name = node.get("name", "")
        cid = int(node["id"])
        path.append(name)
        full_path = " > ".join(path)
        lines.append(f"- {full_path}")
        paths.append(full_path)
        lookup[_normalize(full_path)] = cid
        leaf_key = _normalize(name)
        lookup.setdefault(leaf_key, cid)
        for child in node.get("children") or []:
            self._walk(lines, lookup, paths, child, path)
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
