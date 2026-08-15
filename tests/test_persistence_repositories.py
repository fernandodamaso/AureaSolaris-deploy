from __future__ import annotations

from persistence.databases import DatabaseRepository
from persistence.hermes_repository import HermesRepository
from persistence.identity_repository import IdentityRepository
from persistence.knowledge_repository import KnowledgeRepository


class StorageSpy:
    def __init__(self) -> None:
        self.calls: list[tuple[str, tuple, dict]] = []

    def _record(self, name: str, *args, **kwargs):
        self.calls.append((name, args, kwargs))
        return {"method": name, "args": args, "kwargs": kwargs}

    def initialize(self):
        return self._record("initialize")

    def diagnostic(self):
        return self._record("diagnostic")

    def backup_private(self):
        return self._record("backup_private")

    def list_private_accounts_for_bootstrap(self):
        return self._record("list_private_accounts_for_bootstrap")

    def create_local_account_if_empty(self, *args, **kwargs):
        return self._record("create_local_account_if_empty", *args, **kwargs)

    def create_private_account(self, *args, **kwargs):
        return self._record("create_private_account", *args, **kwargs)

    def authenticate_private_account(self, *args, **kwargs):
        return self._record("authenticate_private_account", *args, **kwargs)

    def open_hermes_thread(self, *args, **kwargs):
        return self._record("open_hermes_thread", *args, **kwargs)

    def list_hermes_threads(self, *args, **kwargs):
        return self._record("list_hermes_threads", *args, **kwargs)

    def append_hermes_message(self, *args, **kwargs):
        return self._record("append_hermes_message", *args, **kwargs)

    def get_hermes_thread_context(self, *args, **kwargs):
        return self._record("get_hermes_thread_context", *args, **kwargs)

    def propose_hermes_memory(self, *args, **kwargs):
        return self._record("propose_hermes_memory", *args, **kwargs)

    def list_hermes_memories(self, *args, **kwargs):
        return self._record("list_hermes_memories", *args, **kwargs)

    def review_hermes_memory(self, *args, **kwargs):
        return self._record("review_hermes_memory", *args, **kwargs)

    def search_knowledge(self, *args, **kwargs):
        return self._record("search_knowledge", *args, **kwargs)


def test_database_repository_owns_lifecycle_and_backup_only() -> None:
    storage = StorageSpy()
    repository = DatabaseRepository(storage)

    assert repository.diagnostic()["method"] == "diagnostic"
    assert repository.backup_private()["method"] == "backup_private"
    assert not hasattr(repository, "open_hermes_thread")
    assert not hasattr(repository, "create_private_account")


def test_identity_repository_routes_identity_operations_without_cross_feature_api() -> None:
    storage = StorageSpy()
    repository = IdentityRepository(storage)

    assert repository.list_accounts_for_bootstrap()["method"] == "list_private_accounts_for_bootstrap"
    created = repository.create_account(
        account_id="owner-a",
        display_name="Owner A",
        login_name="owner-a",
        password="correct horse battery staple",
    )
    assert created["method"] == "create_private_account"
    assert repository.authenticate("owner-a", "secret")["method"] == "authenticate_private_account"
    assert not hasattr(repository, "search_knowledge")
    assert not hasattr(repository, "open_thread")


def test_hermes_repository_preserves_owner_id_on_every_private_operation() -> None:
    storage = StorageSpy()
    repository = HermesRepository(storage)

    repository.open_thread("owner-a", "topic-a", "Topic A")
    repository.append_message(
        owner_id="owner-a",
        thread_id="thread-a",
        role="user",
        content="hello",
        provenance_kind="personal_statement",
    )
    repository.list_memories("owner-a", "approved", 20)

    assert storage.calls[0][1][0] == "owner-a"
    assert storage.calls[1][2]["owner_id"] == "owner-a"
    assert storage.calls[2][1][0] == "owner-a"
    assert not hasattr(repository, "backup_private")


def test_knowledge_repository_has_read_focused_contract() -> None:
    storage = StorageSpy()
    repository = KnowledgeRepository(storage)

    result = repository.search("saturno", limit=8, types=["claim"])

    assert result["method"] == "search_knowledge"
    assert result["args"] == ("saturno",)
    assert result["kwargs"] == {"limit": 8, "types": ["claim"]}
    assert not hasattr(repository, "create_account")
