"""Focused database lifecycle boundary for Aurea persistence.

The legacy LocalStorage implementation remains the compatibility backend while
callers migrate to feature-owned repositories.  This class intentionally
exposes lifecycle/diagnostic/backup operations only; feature CRUD belongs to
other repositories in this package.
"""

from __future__ import annotations

from typing import Any


class DatabaseRepository:
    """Database lifecycle, migration initialization, diagnostics and backup."""

    __slots__ = ("_storage",)

    def __init__(self, storage: Any):
        self._storage = storage

    def initialize(self) -> dict:
        return self._storage.initialize()

    def diagnostic(self) -> dict:
        return self._storage.diagnostic()

    def backup_private(self) -> dict:
        return self._storage.backup_private()
