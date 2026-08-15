"""Composition root for feature-owned persistence repositories."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .databases import DatabaseRepository
from .hermes_repository import HermesRepository
from .identity_repository import IdentityRepository
from .knowledge_repository import KnowledgeRepository


@dataclass(frozen=True)
class PersistenceRepositories:
    databases: DatabaseRepository
    identity: IdentityRepository
    hermes: HermesRepository
    knowledge: KnowledgeRepository

    @classmethod
    def from_storage(cls, storage: Any) -> "PersistenceRepositories":
        return cls(
            databases=DatabaseRepository(storage),
            identity=IdentityRepository(storage),
            hermes=HermesRepository(storage),
            knowledge=KnowledgeRepository(storage),
        )


def get_persistence_repositories() -> PersistenceRepositories:
    """Return focused repositories backed by the canonical local storage singleton.

    Importing lazily prevents persistence modules from taking ownership of the
    legacy facade during the compatibility window.
    """

    from local_storage import get_storage

    return PersistenceRepositories.from_storage(get_storage())
