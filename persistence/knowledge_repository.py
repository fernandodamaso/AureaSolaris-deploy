"""Read-focused editorial knowledge persistence boundary."""

from __future__ import annotations

from typing import Any


class KnowledgeRepository:
    __slots__ = ("_storage",)

    def __init__(self, storage: Any):
        self._storage = storage

    def search(self, query: str, limit: int = 20, types: list[str] | None = None) -> dict:
        return self._storage.search_knowledge(query, limit=limit, types=types)
