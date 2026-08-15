"""Composition root for feature-owned persistence repositories."""

from __future__ import annotations

from dataclasses import dataclass
from threading import RLock
from typing import Any

from .backup import BackupRepository
from .backend import LegacyStorageBackend
from .compatibility import StorageCompatibilityFacade
from .databases import DatabaseRepository
from .hermes_repository import HermesRepository
from .identity_repository import IdentityRepository
from .knowledge_repository import KnowledgeRepository


@dataclass(frozen=True)
class PersistenceRepositories:
    databases: DatabaseRepository
    backup: BackupRepository
    identity: IdentityRepository
    hermes: HermesRepository
    knowledge: KnowledgeRepository

    @classmethod
    def from_storage(cls, storage: Any) -> "PersistenceRepositories":
        return cls(
            databases=DatabaseRepository(storage),
            backup=BackupRepository(storage),
            identity=IdentityRepository(storage),
            hermes=HermesRepository(storage),
            knowledge=KnowledgeRepository(storage),
        )


_backend: LegacyStorageBackend | None = None
_repositories: PersistenceRepositories | None = None
_compatibility: StorageCompatibilityFacade | None = None
_composition_lock = RLock()


def _get_backend() -> LegacyStorageBackend:
    global _backend
    with _composition_lock:
        if _backend is None:
            backend = LegacyStorageBackend.from_environment()
            DatabaseRepository(backend).initialize()
            _backend = backend
        return _backend


def get_persistence_repositories() -> PersistenceRepositories:
    """Return the singleton set of focused production persistence boundaries."""

    global _repositories
    with _composition_lock:
        if _repositories is None:
            _repositories = PersistenceRepositories.from_storage(_get_backend())
        return _repositories


def get_compatibility_storage() -> StorageCompatibilityFacade:
    """Route legacy callers through focused repositories during migration."""

    global _compatibility
    with _composition_lock:
        if _compatibility is None:
            _compatibility = StorageCompatibilityFacade(get_persistence_repositories())
        return _compatibility
