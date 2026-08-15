"""Stable adapter around the preserved SQLite implementation.

The legacy implementation is kept byte-for-byte so migration, validation,
Argon2id, backup and owner-isolation behavior do not drift during the
architecture refactor. Moving that file changes ``__file__``-derived paths, so
this adapter restores the repository/bundle path rules explicitly.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from . import legacy_storage as legacy

_REPOSITORY_ROOT = Path(__file__).resolve().parents[1]


def default_migration_root() -> Path:
    bundle_root = Path(getattr(sys, "_MEIPASS", _REPOSITORY_ROOT))
    bundled = bundle_root / "migrations"
    if bundled.exists():
        return bundled
    return _REPOSITORY_ROOT / "src-tauri" / "migrations"


def embedded_editorial_snapshot_path() -> Path | None:
    configured = os.environ.get("AUREA_EDITORIAL_SNAPSHOT")
    if configured:
        return Path(configured)

    candidate = _REPOSITORY_ROOT / legacy._EMBEDDED_EDITORIAL_RELATIVE_PATH
    if candidate.exists():
        return candidate

    bundle_root = Path(getattr(sys, "_MEIPASS", _REPOSITORY_ROOT))
    bundle_candidate = bundle_root / legacy._EMBEDDED_EDITORIAL_RELATIVE_PATH
    if bundle_candidate.exists():
        return bundle_candidate
    return None


# Methods in the preserved implementation resolve these names from their module
# globals at runtime. Rebinding them keeps the exact old implementation while
# making its new physical location transparent to data/migration resolution.
legacy.default_migration_root = default_migration_root
legacy.embedded_editorial_snapshot_path = embedded_editorial_snapshot_path


class LegacyStorageBackend(legacy.LocalStorage):
    """Deprecated all-purpose backend retained only behind focused repositories."""


StorageNotFoundError = legacy.StorageNotFoundError
StorageValidationError = legacy.StorageValidationError
Migration = legacy.Migration
BackupReceipt = legacy.BackupReceipt
