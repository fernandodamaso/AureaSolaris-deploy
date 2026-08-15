"""Temporary compatibility facade for legacy sidecar callers.

The facade has no direct database handle: every operation is routed to one
focused repository. New feature code should inject/use the focused repository
it needs instead of depending on this transitional surface.
"""

from __future__ import annotations

from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from .services import PersistenceRepositories


class StorageCompatibilityFacade:
    __slots__ = ("_repositories",)

    def __init__(self, repositories: "PersistenceRepositories"):
        self._repositories = repositories

    # Database lifecycle -------------------------------------------------
    def initialize(self) -> dict:
        return self._repositories.databases.initialize()

    def diagnostic(self) -> dict:
        return self._repositories.databases.diagnostic()

    # Backup -------------------------------------------------------------
    def backup_private(self) -> dict:
        return self._repositories.backup.backup_private()

    # Identity -----------------------------------------------------------
    def list_private_accounts_for_bootstrap(self) -> list[dict]:
        return self._repositories.identity.list_accounts_for_bootstrap()

    def create_local_account_if_empty(self, *args: Any, **kwargs: Any) -> dict:
        return self._repositories.identity.create_local_account_if_empty(*args, **kwargs)

    def create_private_account(self, *args: Any, **kwargs: Any) -> dict:
        return self._repositories.identity.create_account(*args, **kwargs)

    def authenticate_private_account(self, login_name: str, password: str) -> dict:
        return self._repositories.identity.authenticate(login_name, password)

    # Hermes -------------------------------------------------------------
    def open_hermes_thread(self, owner_id: str, topic_key: str, title: str | None = None) -> dict:
        return self._repositories.hermes.open_thread(owner_id, topic_key, title)

    def list_hermes_threads(self, owner_id: str, limit: int = 30) -> list[dict]:
        return self._repositories.hermes.list_threads(owner_id, limit)

    def append_hermes_message(self, *args: Any, **kwargs: Any) -> dict:
        return self._repositories.hermes.append_message(*args, **kwargs)

    def get_hermes_thread_context(self, owner_id: str, thread_id: str, limit: int = 50) -> dict:
        return self._repositories.hermes.get_thread_context(owner_id, thread_id, limit)

    def propose_hermes_memory(self, *args: Any, **kwargs: Any) -> dict:
        return self._repositories.hermes.propose_memory(*args, **kwargs)

    def list_hermes_memories(self, owner_id: str, status: str | None = None, limit: int = 50) -> list[dict]:
        return self._repositories.hermes.list_memories(owner_id, status, limit)

    def review_hermes_memory(self, owner_id: str, memory_id: str, decision: str) -> dict:
        return self._repositories.hermes.review_memory(owner_id, memory_id, decision)

    # Editorial knowledge ------------------------------------------------
    def search_knowledge(self, query: str, limit: int = 20, types: list[str] | None = None) -> dict:
        return self._repositories.knowledge.search(query, limit=limit, types=types)
