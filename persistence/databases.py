"""Focused database lifecycle boundary for Aurea persistence.

Migration discovery/checksum/application remains inside the audited backend for
compatibility, but production callers reach it only through this lifecycle
contract. Feature CRUD and backups live in separate repositories.
"""

from __future__ import annotations

from typing import Any


class DatabaseRepository:
    """Database initialization/migrations and integrity diagnostics only."""

    __slots__ = ("_storage",)

    def __init__(self, storage: Any):
        self._storage = storage

    def initialize(self) -> dict:
        return self._storage.initialize()

    def diagnostic(self) -> dict:
        return self._storage.diagnostic()
