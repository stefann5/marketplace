import asyncio
import difflib
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
        self._display_by_normalized: dict[str, str] = {}
        self._all_paths: list[str] = []
        self._task: asyncio.Task[None] | None = None

    @property
    def formatted_tree(self) -> str:
        return self._formatted

    def resolve(self, query: str | None) -> int | None:
        if not query:
            return None
        normalized = _normalize(query)
        if normalized in self._lookup:
            return self._lookup[normalized]
        close = difflib.get_close_matches(
            normalized, self._lookup.keys(), n=1, cutoff=0.85
        )
        if close:
            display = self._display_by_normalized.get(close[0], close[0])
            log.info("Fuzzy-matched categoryPath %r to %r", query, display)
            return self._lookup[close[0]]
        return None

    def suggest(self, query: str | None, n: int = 5) -> list[str]:
        if not query:
            return []
        normalized = _normalize(query)
        matches = difflib.get_close_matches(
            normalized, self._lookup.keys(), n=n, cutoff=0.3
        )
        seen: set[str] = set()
        out: list[str] = []
        for m in matches:
            display = self._display_by_normalized.get(m, m)
            if display not in seen:
                seen.add(display)
                out.append(display)
        return out

    @property
    def all_paths(self) -> list[str]:
        return list(self._all_paths)

    async def refresh(self) -> bool:
        try:
            roots = await catalog_client.get_category_tree()
            lines: list[str] = []
            lookup: dict[str, int] = {}
            display: dict[str, str] = {}
            paths: list[str] = []
            for root in roots:
                self._walk(lines, lookup, display, paths, root, [])
            self._formatted = "\n".join(lines)
            self._lookup = lookup
            self._display_by_normalized = display
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
        display: dict[str, str],
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
        path_key = _normalize(full_path)
        lookup[path_key] = cid
        display[path_key] = full_path
        leaf_key = _normalize(name)
        if leaf_key not in lookup:
            lookup[leaf_key] = cid
            display[leaf_key] = full_path
        for child in node.get("children") or []:
            self._walk(lines, lookup, display, paths, child, path)
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
