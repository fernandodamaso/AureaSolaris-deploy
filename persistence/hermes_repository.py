"""Owner-scoped Hermes persistence boundary.

Every private operation keeps owner_id explicit.  The repository deliberately
contains no provider/network behavior and cannot infer ownership.
"""

from __future__ import annotations

from typing import Any


class HermesRepository:
    __slots__ = ("_storage",)

    def __init__(self, storage: Any):
        self._storage = storage

    def open_thread(self, owner_id: str, topic_key: str, title: str | None = None) -> dict:
        return self._storage.open_hermes_thread(owner_id, topic_key, title)

    def list_threads(self, owner_id: str, limit: int = 30) -> list[dict]:
        return self._storage.list_hermes_threads(owner_id, limit)

    def append_message(
        self,
        *,
        owner_id: str,
        thread_id: str,
        role: str,
        content: str,
        provenance_kind: str,
        calculation_receipt_hash: str | None = None,
        source_refs: list[str] | None = None,
    ) -> dict:
        return self._storage.append_hermes_message(
            owner_id=owner_id,
            thread_id=thread_id,
            role=role,
            content=content,
            provenance_kind=provenance_kind,
            calculation_receipt_hash=calculation_receipt_hash,
            source_refs=source_refs,
        )

    def get_thread_context(self, owner_id: str, thread_id: str, limit: int = 50) -> dict:
        return self._storage.get_hermes_thread_context(owner_id, thread_id, limit)

    def propose_memory(
        self,
        owner_id: str,
        content: str,
        memory_type: str,
        **context: Any,
    ) -> dict:
        return self._storage.propose_hermes_memory(
            owner_id=owner_id,
            content=content,
            memory_type=memory_type,
            **context,
        )

    def list_memories(self, owner_id: str, status: str | None = None, limit: int = 50) -> list[dict]:
        return self._storage.list_hermes_memories(owner_id, status, limit)

    def review_memory(self, owner_id: str, memory_id: str, decision: str) -> dict:
        return self._storage.review_hermes_memory(owner_id, memory_id, decision)
