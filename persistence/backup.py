"""Verified private-database backup boundary."""

from __future__ import annotations

from typing import Any


class BackupRepository:
    """Create verified backups without exposing unrelated database operations."""

    __slots__ = ("_storage",)

    def __init__(self, storage: Any):
        self._storage = storage

    def backup_private(self) -> dict:
        return self._storage.backup_private()
