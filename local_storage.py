"""Deprecated compatibility import for Aurea persistence.

New code should depend on ``persistence.get_persistence_repositories()`` and use
only the focused repository it owns. This module remains temporarily so legacy
sidecar/tests keep stable imports while production calls are routed through the
focused compatibility facade.
"""

from persistence.legacy_storage import *  # noqa: F401,F403
from persistence.backend import (
    LegacyStorageBackend,
    StorageNotFoundError,
    StorageValidationError,
    default_migration_root,
    embedded_editorial_snapshot_path,
)
from persistence.services import get_compatibility_storage

# Backwards-compatible constructor only. New production code calls focused
# repositories; the old implementation is explicitly named LegacyStorageBackend.
LocalStorage = LegacyStorageBackend


def get_storage():
    """Return the temporary routing facade, never the all-purpose backend."""

    return get_compatibility_storage()
