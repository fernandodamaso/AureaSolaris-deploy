"""Feature-owned persistence boundaries for the Aurea sidecar."""

from .backup import BackupRepository
from .backend import LegacyStorageBackend
from .compatibility import StorageCompatibilityFacade
from .databases import DatabaseRepository
from .hermes_repository import HermesRepository
from .identity_repository import IdentityRepository
from .knowledge_repository import KnowledgeRepository
from .services import (
    PersistenceRepositories,
    get_compatibility_storage,
    get_persistence_repositories,
)

__all__ = [
    "BackupRepository",
    "DatabaseRepository",
    "HermesRepository",
    "IdentityRepository",
    "KnowledgeRepository",
    "LegacyStorageBackend",
    "PersistenceRepositories",
    "StorageCompatibilityFacade",
    "get_compatibility_storage",
    "get_persistence_repositories",
]
