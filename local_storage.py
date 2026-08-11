"""Fundação SQLite local-first do Aurea Solaris.

Cria apenas os esquemas aprovados. Não importa, altera nem apaga dados legados.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sqlite3
import sys
import uuid
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError, VerificationError
from contextlib import closing
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
from typing import Iterable


_PRIVATE_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$")
_HERMES_ROLES = frozenset({"user", "hermes", "system"})
_HERMES_MEMORY_TYPES = frozenset({"preference", "interpretive_pattern", "study_note", "instruction", "correction"})
_HERMES_MEMORY_CONFIDENCES = frozenset({"stated", "inferred", "confirmed", "disputed"})
_HERMES_MEMORY_STATUSES = frozenset({"proposed", "approved", "revoked"})
_KNOWLEDGE_SEARCH_TYPES = frozenset({"concept", "claim", "source"})
_PROVENANCE_KINDS = frozenset(
    {
        "personal_statement",
        "personal_note",
        "calculated_fact",
        "source_excerpt",
        "hermes_inference",
        "system_notice",
    }
)
_EMBEDDED_EDITORIAL_RELATIVE_PATH = Path("knowledge") / "engenharia_astrologica" / "knowledge" / "build" / "editorial_current.sqlite"
_EDITORIAL_IMPORTER_VERSION = "engenharia-astrologica-snapshot-v1"

# The first private bootstrap was initialized once before its migration file
# was committed. This exact historical checksum is accepted as a read-only
# compatibility marker; arbitrary migration changes still fail closed.
_LEGACY_MIGRATION_CHECKSUMS = {
    "private": {
        "0001_initial": frozenset({
            "3373188b0984d86a86b9842256d4bcff64aad47daa1c1f2ebaf93826fe51fbf6",
        }),
    },
    "knowledge": {
        "0001_initial": frozenset({
            "45865ce0463c8a4e1262f0573e5bd620bb7ef4e13cb8bc97d17b5af82fe611b1",
        }),
    },
}
_EDITORIAL_ORIGIN_LABEL = "Engenharia Astrológica vendorizada"


class StorageValidationError(ValueError):
    """Entrada local malformada. A mensagem pode ser mostrada sem dados privados."""


class StorageNotFoundError(LookupError):
    """Recurso privado ausente ou pertencente a outra pessoa."""


_PASSWORD_HASHER = PasswordHasher()


@dataclass(frozen=True)
class Migration:
    version: str
    path: Path
    checksum: str
    sql: str


@dataclass(frozen=True)
class BackupReceipt:
    database: str
    filename: str
    created_at_utc: str
    bytes: int
    sha256: str


class LocalStorage:
    """Gerencia knowledge.sqlite e private.sqlite em diretório privado."""

    def __init__(self, data_dir: Path, migration_root: Path | None = None):
        self.data_dir = Path(data_dir).resolve()
        self.app_data_dir = self.data_dir.parent
        self.backup_dir = self.app_data_dir / "backups"
        self.migration_root = migration_root or default_migration_root()
        self._lock = RLock()

    @classmethod
    def from_environment(cls) -> "LocalStorage":
        configured = os.environ.get("AUREA_DATA_DIR")
        if configured:
            data_dir = Path(configured)
        else:
            local_app_data = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
            if not local_app_data:
                raise RuntimeError(
                    "AUREA_DATA_DIR não foi informado e o diretório local do sistema não está disponível."
                )
            data_dir = Path(local_app_data) / "Aurea Solaris" / "data"
        return cls(data_dir)

    def initialize(self) -> dict:
        with self._lock:
            self.data_dir.mkdir(parents=True, exist_ok=True)
            self.backup_dir.mkdir(parents=True, exist_ok=True)
            private = self._open_and_migrate("private")
            knowledge = self._open_and_migrate("knowledge")
            private.close()
            knowledge.close()
            self._install_embedded_editorial_snapshot()
            return self.diagnostic()

    def diagnostic(self) -> dict:
        with self._lock:
            editorial_import = self._editorial_import_diagnostic()
            return {
                "private_database": self._database_diagnostic("private"),
                "knowledge_database": self._database_diagnostic("knowledge"),
                "editorial_import": editorial_import,
                # Compatibilidade com clientes anteriores. O nome histórico não
                # significa que a carga editorial é legada nem dispensável.
                "legacy_import_status": editorial_import["status"],
            }

    def backup_private(self) -> dict:
        with self._lock:
            source_path = self._database_path("private")
            if not source_path.exists():
                raise RuntimeError("private.sqlite ainda não foi inicializado.")
            destination = self._backup_path("private", "manual")
            with closing(self._connect(source_path)) as source:
                self._backup_connection(source, destination)
            return asdict(self._backup_receipt("private.sqlite", destination))

    def create_private_account(
        self,
        account_id: str,
        display_name: str,
        login_name: str,
        password_verifier: str | None = None,
        password_salt: str | None = None,
        password_algorithm: str | None = None,
        *,
        password: str | None = None,
    ) -> dict:
        """Create an account using Argon2id; old verifier arguments are migration-only."""
        account_id = _validate_private_id(account_id, "account_id")
        display_name = _validate_text(display_name, "display_name", maximum=240)
        login_name = _validate_text(login_name, "login_name", maximum=240)
        if password is not None:
            password = _validate_text(password, "password", maximum=1024)
            password_verifier = _PASSWORD_HASHER.hash(password)
            password_salt = ""
            password_algorithm = "argon2id"
        elif password_verifier is not None and password_salt is not None and password_algorithm == "PBKDF2-SHA-256":
            password_verifier = _validate_text(password_verifier, "password_verifier", maximum=4096)
            password_salt = _validate_text(password_salt, "password_salt", maximum=512)
        else:
            raise StorageValidationError("Senha obrigatória para novas contas.")
        with self._lock, closing(self._private_connection()) as connection:
            existing = connection.execute("SELECT id FROM account WHERE id = ?", (account_id,)).fetchone()
            if existing:
                return {"created": False, "account_id": account_id}
            try:
                connection.execute(
                    """
                    INSERT INTO account(id, display_name, login_name, password_verifier,
                                        password_salt, password_algorithm)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (account_id, display_name, login_name, password_verifier, password_salt, password_algorithm),
                )
                connection.commit()
            except sqlite3.IntegrityError as error:
                raise StorageValidationError("A conta local já existe ou o login está em uso.") from error
        return {"created": True, "account_id": account_id}

    def authenticate_private_account(self, login_name: str, password: str) -> dict:
        """Verify a local account; legacy PBKDF2 records are unsupported for login."""
        login_name = _validate_text(login_name, "login_name", maximum=240)
        password = _validate_text(password, "password", maximum=1024)
        with self._lock, closing(self._private_connection()) as connection:
            row = connection.execute(
                "SELECT id, display_name, password_verifier, password_algorithm, disabled_at "
                "FROM account WHERE login_name = ? COLLATE NOCASE", (login_name,)
            ).fetchone()
            if row is None or row[4] is not None:
                raise StorageValidationError("Credenciais inválidas.")
            if str(row[3]).lower() != "argon2id":
                raise StorageValidationError("Conta legada sem suporte de login; redefina a senha.")
            try:
                valid = _PASSWORD_HASHER.verify(row[2], password)
            except (VerifyMismatchError, VerificationError, InvalidHashError):
                valid = False
            if not valid:
                raise StorageValidationError("Credenciais inválidas.")
            connection.execute("UPDATE account SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", (row[0],))
            connection.commit()
            return {"authenticated": True, "account_id": row[0], "display_name": row[1]}

    # Hermes / "Tudo é Mente" -------------------------------------------------
    # These methods deliberately require owner_id on every private operation.
    # They do not create accounts, infer ownership, or send data to a provider.

    def open_hermes_thread(self, owner_id: str, topic_key: str, title: str | None = None) -> dict:
        """Open the most recent active thread for an owner/topic or create one."""
        owner_id = _validate_private_id(owner_id, "owner_id")
        topic_key = _validate_text(topic_key, "topic_key", maximum=160)
        thread_title = _validate_text(title or topic_key, "title", maximum=240)

        with self._lock, closing(self._private_connection()) as connection:
            self._require_owner(connection, owner_id)
            existing = connection.execute(
                """
                SELECT id, owner_id, title, topic_key, subject_context_json, status,
                       created_at, updated_at
                FROM hermes_thread
                WHERE owner_id = ? AND topic_key = ? AND status = 'active' AND deleted_at IS NULL
                ORDER BY updated_at DESC, created_at DESC
                LIMIT 1
                """,
                (owner_id, topic_key),
            ).fetchone()
            if existing:
                return {"created": False, "thread": _thread_row(existing)}

            thread_id = f"thread_{uuid.uuid4().hex}"
            connection.execute(
                """
                INSERT INTO hermes_thread(id, owner_id, title, topic_key)
                VALUES (?, ?, ?, ?)
                """,
                (thread_id, owner_id, thread_title, topic_key),
            )
            connection.commit()
            created = connection.execute(
                """
                SELECT id, owner_id, title, topic_key, subject_context_json, status,
                       created_at, updated_at
                FROM hermes_thread WHERE id = ? AND owner_id = ?
                """,
                (thread_id, owner_id),
            ).fetchone()
            return {"created": True, "thread": _thread_row(created)}

    def list_hermes_threads(self, owner_id: str, limit: int = 30) -> list[dict]:
        owner_id = _validate_private_id(owner_id, "owner_id")
        limit = _validate_limit(limit, maximum=100)
        with self._lock, closing(self._private_connection()) as connection:
            self._require_owner(connection, owner_id)
            rows = connection.execute(
                """
                SELECT id, owner_id, title, topic_key, subject_context_json, status,
                       created_at, updated_at
                FROM hermes_thread
                WHERE owner_id = ? AND status <> 'deleted' AND deleted_at IS NULL
                ORDER BY updated_at DESC, created_at DESC
                LIMIT ?
                """,
                (owner_id, limit),
            ).fetchall()
            return [_thread_row(row) for row in rows]

    def append_hermes_message(
        self,
        owner_id: str,
        thread_id: str,
        role: str,
        content: str,
        provenance_kind: str,
        *,
        calculation_receipt_hash: str | None = None,
        source_refs: list[str] | None = None,
    ) -> dict:
        """Append an explicitly classified message to an owned active thread."""
        owner_id = _validate_private_id(owner_id, "owner_id")
        thread_id = _validate_private_id(thread_id, "thread_id")
        if role not in _HERMES_ROLES:
            raise StorageValidationError("role inválido para mensagem Hermes.")
        if provenance_kind not in _PROVENANCE_KINDS:
            raise StorageValidationError("provenance_kind inválido para mensagem Hermes.")
        content = _validate_text(content, "content", maximum=50_000)
        if calculation_receipt_hash is not None and not re.fullmatch(r"[a-fA-F0-9]{64}", calculation_receipt_hash):
            raise StorageValidationError("calculation_receipt_hash deve ser um SHA-256.")
        refs = _validate_source_refs(source_refs)

        with self._lock, closing(self._private_connection()) as connection:
            self._require_active_thread(connection, owner_id, thread_id)
            message_id = f"message_{uuid.uuid4().hex}"
            connection.execute(
                """
                INSERT INTO hermes_message(
                  id, owner_id, thread_id, role, content, provenance_kind,
                  calculation_receipt_hash, source_refs_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    message_id,
                    owner_id,
                    thread_id,
                    role,
                    content,
                    provenance_kind,
                    calculation_receipt_hash,
                    json.dumps(refs, ensure_ascii=False, separators=(",", ":")),
                ),
            )
            connection.execute(
                "UPDATE hermes_thread SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_id = ?",
                (thread_id, owner_id),
            )
            connection.commit()
            row = connection.execute(
                """
                SELECT id, owner_id, thread_id, role, content, provenance_kind,
                       calculation_receipt_hash, source_refs_json, created_at
                FROM hermes_message WHERE id = ? AND owner_id = ?
                """,
                (message_id, owner_id),
            ).fetchone()
            return _message_row(row)

    def get_hermes_thread_context(self, owner_id: str, thread_id: str, limit: int = 50) -> dict:
        """Return only the requested owner's thread and recent classified messages."""
        owner_id = _validate_private_id(owner_id, "owner_id")
        thread_id = _validate_private_id(thread_id, "thread_id")
        limit = _validate_limit(limit, maximum=100)
        with self._lock, closing(self._private_connection()) as connection:
            thread = self._require_active_thread(connection, owner_id, thread_id)
            rows = connection.execute(
                """
                SELECT id, owner_id, thread_id, role, content, provenance_kind,
                       calculation_receipt_hash, source_refs_json, created_at
                FROM hermes_message
                WHERE owner_id = ? AND thread_id = ? AND deleted_at IS NULL
                ORDER BY created_at DESC, id DESC
                LIMIT ?
                """,
                (owner_id, thread_id, limit),
            ).fetchall()
            # Query DESC for a bounded scan, return chronological conversation.
            return {"thread": _thread_row(thread), "messages": [_message_row(row) for row in reversed(rows)]}

    def propose_hermes_memory(
        self,
        owner_id: str,
        content: str,
        memory_type: str,
        *,
        evidence_note: str | None = None,
        topic_key: str | None = None,
        subject_kind: str | None = None,
        subject_ref: str | None = None,
        source_thread_id: str | None = None,
        source_message_id: str | None = None,
        confidence: str = "inferred",
    ) -> dict:
        """Create a reviewable Hermes memory; it is never approved silently."""
        owner_id = _validate_private_id(owner_id, "owner_id")
        content = _validate_text(content, "content", maximum=20_000)
        if memory_type not in _HERMES_MEMORY_TYPES:
            raise StorageValidationError("memory_type invalido para memoria Hermes.")
        if confidence not in _HERMES_MEMORY_CONFIDENCES:
            raise StorageValidationError("confidence invalido para memoria Hermes.")
        evidence_note = _validate_optional_text(evidence_note, "evidence_note", maximum=2_000)
        topic_key = _validate_optional_text(topic_key, "topic_key", maximum=160)
        subject_kind = _validate_optional_text(subject_kind, "subject_kind", maximum=80)
        subject_ref = _validate_optional_text(subject_ref, "subject_ref", maximum=240)
        source_thread_id = _validate_optional_private_id(source_thread_id, "source_thread_id")
        source_message_id = _validate_optional_private_id(source_message_id, "source_message_id")

        with self._lock, closing(self._private_connection()) as connection:
            self._require_owner(connection, owner_id)
            if source_thread_id:
                self._require_active_thread(connection, owner_id, source_thread_id)
            if source_message_id:
                self._require_message(connection, owner_id, source_message_id)

            memory_id = f"memory_{uuid.uuid4().hex}"
            connection.execute(
                """
                INSERT INTO hermes_memory(
                  id, owner_id, memory_type, content, evidence_note, status,
                  topic_key, subject_kind, subject_ref, source_thread_id,
                  source_message_id, confidence
                ) VALUES (?, ?, ?, ?, ?, 'proposed', ?, ?, ?, ?, ?, ?)
                """,
                (
                    memory_id,
                    owner_id,
                    memory_type,
                    content,
                    evidence_note,
                    topic_key,
                    subject_kind,
                    subject_ref,
                    source_thread_id,
                    source_message_id,
                    confidence,
                ),
            )
            if source_message_id:
                connection.execute(
                    """
                    INSERT OR IGNORE INTO hermes_memory_evidence(
                      id, owner_id, memory_id, evidence_kind, evidence_ref, evidence_snapshot
                    ) VALUES (?, ?, ?, 'message', ?, ?)
                    """,
                    (
                        f"evidence_{uuid.uuid4().hex}",
                        owner_id,
                        memory_id,
                        source_message_id,
                        evidence_note,
                    ),
                )
            connection.commit()
            return self._get_memory_row(connection, owner_id, memory_id)

    def list_hermes_memories(self, owner_id: str, status: str | None = None, limit: int = 50) -> list[dict]:
        owner_id = _validate_private_id(owner_id, "owner_id")
        limit = _validate_limit(limit, maximum=100)
        if status is not None and status not in _HERMES_MEMORY_STATUSES:
            raise StorageValidationError("status invalido para memoria Hermes.")

        with self._lock, closing(self._private_connection()) as connection:
            self._require_owner(connection, owner_id)
            if status:
                rows = connection.execute(
                    """
                    SELECT id, owner_id, memory_type, content, evidence_note, status, topic_key,
                           subject_kind, subject_ref, source_thread_id, source_message_id,
                           confidence, created_at, updated_at, approved_at, revoked_at, deleted_at
                    FROM hermes_memory
                    WHERE owner_id = ? AND status = ? AND deleted_at IS NULL
                    ORDER BY updated_at DESC, created_at DESC
                    LIMIT ?
                    """,
                    (owner_id, status, limit),
                ).fetchall()
            else:
                rows = connection.execute(
                    """
                    SELECT id, owner_id, memory_type, content, evidence_note, status, topic_key,
                           subject_kind, subject_ref, source_thread_id, source_message_id,
                           confidence, created_at, updated_at, approved_at, revoked_at, deleted_at
                    FROM hermes_memory
                    WHERE owner_id = ? AND deleted_at IS NULL
                    ORDER BY updated_at DESC, created_at DESC
                    LIMIT ?
                    """,
                    (owner_id, limit),
                ).fetchall()
            return [_memory_row(row) for row in rows]

    def search_knowledge(self, query: str, limit: int = 20, types: list[str] | None = None) -> dict:
        query = _validate_text(query, "query", maximum=500)
        limit = _validate_limit(limit, maximum=100)
        if types is not None:
            if not isinstance(types, list) or not types:
                raise StorageValidationError("types deve ser uma lista não vazia de knowledge types.")
            for knowledge_type in types:
                if knowledge_type not in _KNOWLEDGE_SEARCH_TYPES:
                    raise StorageValidationError("Tipo de busca desconhecido.")

        with self._lock, closing(self._open_and_migrate("knowledge")) as connection:
            escaped_query = query.replace('%', '\\%').replace('_', '\\_')
            bindings = {"query": f"%{escaped_query}%", "limit": limit}
            result: dict = {"concepts": [], "claims": [], "sources": []}

            if types is None or "concept" in types:
                rows = connection.execute(
                    """
                    SELECT id, label, concept_type, description, status, created_at
                    FROM concept
                    WHERE UPPER(label) LIKE UPPER(:query)
                       OR UPPER(description) LIKE UPPER(:query)
                    ORDER BY created_at DESC
                    LIMIT :limit
                    """,
                    bindings,
                ).fetchall()
                result["concepts"] = [
                    {
                        "id": row["id"],
                        "label": row["label"],
                        "concept_type": row["concept_type"],
                        "description": row["description"],
                        "status": row["status"],
                        "created_at": row["created_at"],
                    }
                    for row in rows
                ]

            if types is None or "claim" in types:
                rows = connection.execute(
                    """
                    SELECT claim.id, claim.concept_id, claim.source_id, claim.statement,
                           claim.tradition, claim.interpretation_scope, claim.evidence_grade,
                           claim.editorial_status, claim.source_locator, source.title AS source_title,
                           source.author AS source_author
                    FROM claim
                    JOIN source ON claim.source_id = source.id
                    WHERE UPPER(claim.statement) LIKE UPPER(:query)
                       OR UPPER(source.title) LIKE UPPER(:query)
                       OR UPPER(source.author) LIKE UPPER(:query)
                    ORDER BY claim.created_at DESC
                    LIMIT :limit
                    """,
                    bindings,
                ).fetchall()
                result["claims"] = [
                    {
                        "id": row["id"],
                        "concept_id": row["concept_id"],
                        "source_id": row["source_id"],
                        "statement": row["statement"],
                        "tradition": row["tradition"],
                        "interpretation_scope": row["interpretation_scope"],
                        "evidence_grade": row["evidence_grade"],
                        "editorial_status": row["editorial_status"],
                        "source_locator": row["source_locator"],
                        "source_title": row["source_title"],
                        "source_author": row["source_author"],
                    }
                    for row in rows
                ]

            if types is None or "source" in types:
                rows = connection.execute(
                    """
                    SELECT id, title, author, publisher, published_year, source_kind,
                           tradition, language, canonical_url
                    FROM source
                    WHERE UPPER(title) LIKE UPPER(:query)
                       OR UPPER(author) LIKE UPPER(:query)
                       OR UPPER(tradition) LIKE UPPER(:query)
                    ORDER BY created_at DESC
                    LIMIT :limit
                    """,
                    bindings,
                ).fetchall()
                result["sources"] = [
                    {
                        "id": row["id"],
                        "title": row["title"],
                        "author": row["author"],
                        "publisher": row["publisher"],
                        "published_year": row["published_year"],
                        "source_kind": row["source_kind"],
                        "tradition": row["tradition"],
                        "language": row["language"],
                        "canonical_url": row["canonical_url"],
                    }
                    for row in rows
                ]

            if result["concepts"] or result["claims"] or result["sources"]:
                return result

            # Once a snapshot has been installed in knowledge.sqlite, that
            # database is the operational source of truth. Do not silently
            # consult another file for a query that simply has no match.
            if self._knowledge_has_editorial_import(connection):
                return result

        fallback = self._search_embedded_editorial_snapshot(query, limit=limit, types=types)
        if fallback is not None:
            return fallback
        return {"concepts": [], "claims": [], "sources": []}

    def _install_embedded_editorial_snapshot(self) -> dict:
        """Install the bundled editorial snapshot once, with immutable provenance.

        The snapshot remains an editorial artifact. This importer copies it into
        the canonical runtime database under snapshot-scoped ids, never updates
        an existing imported record, and records the exact SHA-256 in
        ``import_manifest``. Re-running it against the same artifact is a no-op.
        """
        snapshot_path = embedded_editorial_snapshot_path()
        if snapshot_path is None or not snapshot_path.exists():
            return {"status": "snapshot_unavailable"}

        snapshot_hash = _sha256_file(snapshot_path)
        snapshot_prefix = snapshot_hash[:16]
        manifest_id = f"ea:import:{snapshot_hash}"

        with closing(self._open_snapshot_readonly(snapshot_path)) as snapshot:
            self._validate_editorial_snapshot(snapshot)
            content_items = snapshot.execute(
                """
                SELECT id, name, status, category, source_path, source_hash, raw_yaml,
                       quality_state, compiled_at
                FROM content_item
                ORDER BY source_path
                """
            ).fetchall()
            reference_documents = snapshot.execute(
                """
                SELECT source_path, name, category, source_hash, raw_yaml, compiled_at
                FROM reference_document
                ORDER BY source_path
                """
            ).fetchall()
            relations = snapshot.execute(
                """
                SELECT from_id, relation, to_id, note
                FROM content_relation
                ORDER BY from_id, relation, to_id
                """
            ).fetchall()

        with closing(self._open_and_migrate("knowledge")) as target:
            existing = target.execute(
                "SELECT id FROM import_manifest WHERE id = ?", (manifest_id,)
            ).fetchone()
            if existing is not None:
                return {
                    "status": "installed",
                    "snapshot_sha256": snapshot_hash,
                    "idempotent": True,
                }

            existing_rows = target.execute(
                "SELECT (SELECT COUNT(*) FROM source) + (SELECT COUNT(*) FROM concept)"
            ).fetchone()[0]
            if existing_rows:
                self._backup_connection(target, self._backup_path("knowledge", "before-editorial-import"))

            source_ids: dict[str, str] = {}
            concept_ids: dict[str, str] = {}
            document_count = 0
            try:
                target.execute("BEGIN IMMEDIATE")
                for item in content_items:
                    source_id = f"ea:source:{snapshot_prefix}:{item['id']}"
                    document_id = f"ea:document:{snapshot_prefix}:{item['id']}"
                    concept_id = f"ea:concept:{snapshot_prefix}:{item['id']}"
                    claim_id = f"ea:claim:{snapshot_prefix}:{item['id']}"
                    source_ids[item["id"]] = source_id
                    concept_ids[item["id"]] = concept_id

                    target.execute(
                        """
                        INSERT OR IGNORE INTO source(
                            id, title, author, source_kind, tradition, language,
                            license_note, canonical_url
                        ) VALUES (?, ?, ?, 'personal_archive', ?, 'pt-BR', ?, ?)
                        """,
                        (
                            source_id,
                            item["name"],
                            _EDITORIAL_ORIGIN_LABEL,
                            item["category"],
                            "Snapshot editorial vendorizado; preserve caminho e hash de origem.",
                            item["source_path"],
                        ),
                    )
                    target.execute(
                        """
                        INSERT OR IGNORE INTO source_document(
                            id, source_id, original_path, media_type, content_text, content_sha256
                        ) VALUES (?, ?, ?, 'application/x-yaml', ?, ?)
                        """,
                        (document_id, source_id, item["source_path"], item["raw_yaml"], item["source_hash"]),
                    )
                    target.execute(
                        """
                        INSERT OR IGNORE INTO concept(
                            id, label, concept_type, description, status
                        ) VALUES (?, ?, ?, ?, ?)
                        """,
                        (
                            concept_id,
                            item["name"],
                            _canonical_concept_type(item["category"], item["name"]),
                            item["raw_yaml"],
                            _canonical_concept_status(item["status"]),
                        ),
                    )
                    target.execute(
                        """
                        INSERT OR IGNORE INTO claim(
                            id, concept_id, source_id, statement, tradition,
                            interpretation_scope, evidence_grade, editorial_status, source_locator
                        ) VALUES (?, ?, ?, ?, ?, ?, 'editorial', ?, ?)
                        """,
                        (
                            claim_id,
                            concept_id,
                            source_id,
                            item["raw_yaml"],
                            item["category"],
                            "Ficha editorial de estudo; consulte a proveniência e as divergências declaradas.",
                            _canonical_editorial_status(item["status"]),
                            item["source_path"],
                        ),
                    )
                    document_count += 1

                for document in reference_documents:
                    path_digest = _sha256(document["source_path"].encode("utf-8"))[:20]
                    source_id = f"ea:reference-source:{snapshot_prefix}:{path_digest}"
                    document_id = f"ea:reference-document:{snapshot_prefix}:{path_digest}"
                    target.execute(
                        """
                        INSERT OR IGNORE INTO source(
                            id, title, author, source_kind, tradition, language,
                            license_note, canonical_url
                        ) VALUES (?, ?, ?, 'personal_archive', ?, 'pt-BR', ?, ?)
                        """,
                        (
                            source_id,
                            document["name"],
                            _EDITORIAL_ORIGIN_LABEL,
                            document["category"],
                            "Documento de referência do snapshot editorial vendorizado.",
                            document["source_path"],
                        ),
                    )
                    target.execute(
                        """
                        INSERT OR IGNORE INTO source_document(
                            id, source_id, original_path, media_type, content_text, content_sha256
                        ) VALUES (?, ?, ?, 'application/x-yaml', ?, ?)
                        """,
                        (document_id, source_id, document["source_path"], document["raw_yaml"], document["source_hash"]),
                    )
                    document_count += 1

                for relation in relations:
                    from_id = concept_ids.get(relation["from_id"])
                    to_id = concept_ids.get(relation["to_id"])
                    if from_id is None or to_id is None:
                        raise RuntimeError("Relação editorial aponta para ficha ausente no snapshot.")
                    target.execute(
                        """
                        INSERT OR IGNORE INTO concept_relation(
                            id, from_concept_id, to_concept_id, relation_type, source_id, note
                        ) VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        (
                            f"ea:relation:{snapshot_prefix}:{_sha256((relation['from_id'] + '|' + relation['relation'] + '|' + relation['to_id']).encode('utf-8'))[:24]}",
                            from_id,
                            to_id,
                            _canonical_relation_type(relation["relation"]),
                            source_ids[relation["from_id"]],
                            _relation_note(relation["relation"], relation["note"]),
                        ),
                    )

                notes = json.dumps(
                    {
                        "snapshot_path": str(snapshot_path.name),
                        "content_items": len(content_items),
                        "reference_documents": len(reference_documents),
                        "relations": len(relations),
                        "source_documents": document_count,
                    },
                    ensure_ascii=False,
                    sort_keys=True,
                )
                target.execute(
                    """
                    INSERT INTO import_manifest(
                        id, importer_version, origin_label, source_tree_sha256, file_count, notes
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        manifest_id,
                        _EDITORIAL_IMPORTER_VERSION,
                        _EDITORIAL_ORIGIN_LABEL,
                        snapshot_hash,
                        document_count,
                        notes,
                    ),
                )
                target.commit()
            except Exception:
                target.rollback()
                raise

        return {
            "status": "installed",
            "snapshot_sha256": snapshot_hash,
            "idempotent": False,
            "content_items": len(content_items),
            "source_documents": document_count,
        }

    def _editorial_import_diagnostic(self) -> dict:
        snapshot_path = embedded_editorial_snapshot_path()
        snapshot_hash = _sha256_file(snapshot_path) if snapshot_path and snapshot_path.exists() else None
        knowledge_path = self._database_path("knowledge")
        if not knowledge_path.exists():
            return {"status": "not_initialized", "snapshot_sha256": snapshot_hash}

        with closing(self._connect(knowledge_path)) as connection:
            self._configure(connection)
            if not self._table_exists(connection, "import_manifest"):
                return {"status": "pending" if snapshot_hash else "snapshot_unavailable"}
            row = connection.execute(
                """
                SELECT id, source_tree_sha256, file_count, imported_at, notes
                FROM import_manifest
                WHERE importer_version = ? AND origin_label = ?
                ORDER BY imported_at DESC
                LIMIT 1
                """,
                (_EDITORIAL_IMPORTER_VERSION, _EDITORIAL_ORIGIN_LABEL),
            ).fetchone()
            if row is None:
                return {"status": "pending" if snapshot_hash else "snapshot_unavailable"}
            try:
                details = json.loads(row["notes"] or "{}")
            except json.JSONDecodeError:
                details = {}
            prefix = row["source_tree_sha256"][:16]
            actual_concepts = connection.execute(
                "SELECT COUNT(*) FROM concept WHERE id LIKE ?", (f"ea:concept:{prefix}:%",)
            ).fetchone()[0]
            expected_concepts = int(details.get("content_items", 0))
            verified = expected_concepts > 0 and actual_concepts == expected_concepts
            status = "installed" if verified else "verification_failed"
            if status == "installed" and snapshot_hash and snapshot_hash != row["source_tree_sha256"]:
                status = "installed_snapshot_outdated"
            return {
                "status": status,
                "manifest_id": row["id"],
                "snapshot_sha256": row["source_tree_sha256"],
                "imported_at": row["imported_at"],
                "content_items": actual_concepts,
                "source_documents": row["file_count"],
            }

    @staticmethod
    def _knowledge_has_editorial_import(connection: sqlite3.Connection) -> bool:
        return connection.execute(
            """
            SELECT 1 FROM import_manifest
            WHERE importer_version = ? AND origin_label = ?
            LIMIT 1
            """,
            (_EDITORIAL_IMPORTER_VERSION, _EDITORIAL_ORIGIN_LABEL),
        ).fetchone() is not None

    @staticmethod
    def _open_snapshot_readonly(path: Path) -> sqlite3.Connection:
        connection = sqlite3.connect(path.as_uri() + "?mode=ro", uri=True)
        connection.row_factory = sqlite3.Row
        return connection

    @staticmethod
    def _validate_editorial_snapshot(connection: sqlite3.Connection) -> None:
        if LocalStorage._integrity(connection) != "ok":
            raise RuntimeError("Snapshot editorial com integridade SQLite inválida.")
        required = {"content_item", "content_relation", "reference_document"}
        existing = {
            row[0]
            for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
        }
        missing = sorted(required - existing)
        if missing:
            raise RuntimeError("Snapshot editorial incompleto: " + ", ".join(missing))
        item_count = connection.execute("SELECT COUNT(*) FROM content_item").fetchone()[0]
        if item_count <= 0:
            raise RuntimeError("Snapshot editorial não possui fichas para importar.")

    def _search_embedded_editorial_snapshot(
        self,
        query: str,
        *,
        limit: int,
        types: list[str] | None,
    ) -> dict | None:
        snapshot_path = embedded_editorial_snapshot_path()
        if snapshot_path is None or not snapshot_path.exists():
            return None

        escaped_query = query.replace('%', '\\%').replace('_', '\\_')
        bindings = {"query": f"%{escaped_query}%", "limit": limit}
        result: dict = {"concepts": [], "claims": [], "sources": []}

        with closing(self._connect(snapshot_path)) as connection:
            if types is None or "concept" in types:
                rows = connection.execute(
                    """
                    SELECT content_item.id,
                           content_item.name AS label,
                           content_item.category AS concept_type,
                           substr(content_fts.searchable_text, 1, 500) AS description,
                           COALESCE(content_item.status, content_item.quality_state) AS status,
                           content_item.compiled_at AS created_at
                    FROM content_item
                    JOIN content_fts ON content_fts.item_id = content_item.id
                    WHERE UPPER(content_item.name) LIKE UPPER(:query)
                       OR UPPER(content_item.category) LIKE UPPER(:query)
                       OR UPPER(content_item.source_path) LIKE UPPER(:query)
                       OR UPPER(content_fts.searchable_text) LIKE UPPER(:query)
                    ORDER BY content_item.compiled_at DESC
                    LIMIT :limit
                    """,
                    bindings,
                ).fetchall()
                result["concepts"] = [
                    {
                        "id": row["id"],
                        "label": row["label"],
                        "concept_type": row["concept_type"],
                        "description": row["description"],
                        "status": row["status"],
                        "created_at": row["created_at"],
                    }
                    for row in rows
                ]

            if types is None or "source" in types:
                rows = connection.execute(
                    """
                    SELECT source_path AS id,
                           name AS title,
                           NULL AS author,
                           NULL AS publisher,
                           NULL AS published_year,
                           category AS source_kind,
                           'engenharia_astrologica_snapshot' AS tradition,
                           'pt-BR' AS language,
                           source_path AS canonical_url
                    FROM reference_document
                    WHERE UPPER(name) LIKE UPPER(:query)
                       OR UPPER(category) LIKE UPPER(:query)
                       OR UPPER(source_path) LIKE UPPER(:query)
                       OR UPPER(raw_yaml) LIKE UPPER(:query)
                    ORDER BY compiled_at DESC
                    LIMIT :limit
                    """,
                    bindings,
                ).fetchall()
                result["sources"] = [
                    {
                        "id": row["id"],
                        "title": row["title"],
                        "author": row["author"],
                        "publisher": row["publisher"],
                        "published_year": row["published_year"],
                        "source_kind": row["source_kind"],
                        "tradition": row["tradition"],
                        "language": row["language"],
                        "canonical_url": row["canonical_url"],
                    }
                    for row in rows
                ]

        return result

    def review_hermes_memory(self, owner_id: str, memory_id: str, decision: str) -> dict:
        owner_id = _validate_private_id(owner_id, "owner_id")
        memory_id = _validate_private_id(memory_id, "memory_id")
        if decision not in {"approve", "revoke", "forget"}:
            raise StorageValidationError("decision invalida para memoria Hermes.")

        with self._lock, closing(self._private_connection()) as connection:
            self._require_owner(connection, owner_id)
            current = self._get_memory_row(connection, owner_id, memory_id)
            if decision == "approve":
                connection.execute(
                    """
                    UPDATE hermes_memory
                    SET status = 'approved',
                        confidence = CASE WHEN confidence = 'inferred' THEN 'confirmed' ELSE confidence END,
                        approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP),
                        revoked_at = NULL,
                        deleted_at = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND owner_id = ?
                    """,
                    (memory_id, owner_id),
                )
            else:
                connection.execute(
                    """
                    UPDATE hermes_memory
                    SET status = 'revoked',
                        revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP),
                        deleted_at = CASE WHEN ? = 'forget' THEN CURRENT_TIMESTAMP ELSE deleted_at END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND owner_id = ?
                    """,
                    (decision, memory_id, owner_id),
                )
            connection.commit()
            if decision == "forget":
                return {"id": current["id"], "owner_id": owner_id, "status": "revoked", "deleted": True}
            return self._get_memory_row(connection, owner_id, memory_id, include_deleted=True)

    def _private_connection(self) -> sqlite3.Connection:
        path = self._database_path("private")
        if not path.exists():
            self.initialize()
        connection = self._connect(path)
        self._configure(connection)
        return connection

    @staticmethod
    def _require_owner(connection: sqlite3.Connection, owner_id: str) -> None:
        if connection.execute("SELECT 1 FROM account WHERE id = ?", (owner_id,)).fetchone() is None:
            raise StorageNotFoundError("Pessoa proprietária não encontrada.")

    @staticmethod
    def _require_active_thread(connection: sqlite3.Connection, owner_id: str, thread_id: str) -> sqlite3.Row:
        row = connection.execute(
            """
            SELECT id, owner_id, title, topic_key, subject_context_json, status,
                   created_at, updated_at
            FROM hermes_thread
            WHERE id = ? AND owner_id = ? AND status = 'active' AND deleted_at IS NULL
            """,
            (thread_id, owner_id),
        ).fetchone()
        if row is None:
            # Same response for nonexistent and foreign records: never disclose ownership.
            raise StorageNotFoundError("Conversa Hermes não encontrada.")
        return row

    @staticmethod
    def _require_message(connection: sqlite3.Connection, owner_id: str, message_id: str) -> sqlite3.Row:
        row = connection.execute(
            """
            SELECT id, owner_id, thread_id, role, content, provenance_kind,
                   calculation_receipt_hash, source_refs_json, created_at
            FROM hermes_message
            WHERE id = ? AND owner_id = ? AND deleted_at IS NULL
            """,
            (message_id, owner_id),
        ).fetchone()
        if row is None:
            raise StorageNotFoundError("Mensagem Hermes nao encontrada.")
        return row

    @staticmethod
    def _get_memory_row(
        connection: sqlite3.Connection,
        owner_id: str,
        memory_id: str,
        *,
        include_deleted: bool = False,
    ) -> dict:
        deleted_clause = "" if include_deleted else "AND deleted_at IS NULL"
        row = connection.execute(
            f"""
            SELECT id, owner_id, memory_type, content, evidence_note, status, topic_key,
                   subject_kind, subject_ref, source_thread_id, source_message_id,
                   confidence, created_at, updated_at, approved_at, revoked_at, deleted_at
            FROM hermes_memory
            WHERE id = ? AND owner_id = ? {deleted_clause}
            """,
            (memory_id, owner_id),
        ).fetchone()
        if row is None:
            raise StorageNotFoundError("Memoria Hermes nao encontrada.")
        return _memory_row(row)

    def _open_and_migrate(self, database: str) -> sqlite3.Connection:
        path = self._database_path(database)
        existed = path.exists() and path.stat().st_size > 0
        connection = self._connect(path)
        try:
            self._configure(connection)
            migrations = self._load_migrations(database)
            has_migration_table = self._table_exists(connection, "schema_migration")

            if has_migration_table:
                self._verify_applied_checksums(connection, migrations, database)
                pending = self._pending_migrations(connection, migrations)
            else:
                pending = migrations

            if existed and pending:
                self._backup_connection(
                    connection,
                    self._backup_path(database, "before-schema"),
                )

            self._ensure_migration_table(connection)

            for migration in pending:
                try:
                    connection.executescript(
                        "BEGIN IMMEDIATE;\n"
                        f"{migration.sql}\n"
                        "INSERT INTO schema_migration(version, checksum) VALUES "
                        f"({_sql_literal(migration.version)}, {_sql_literal(migration.checksum)});\n"
                        "COMMIT;"
                    )
                except Exception:
                    connection.rollback()
                    raise

            integrity = self._integrity(connection)
            if integrity != "ok":
                raise RuntimeError(f"Integridade inválida em {database}.sqlite: {integrity}")
            return connection
        except Exception:
            connection.close()
            raise

    def _connect(self, path: Path) -> sqlite3.Connection:
        connection = sqlite3.connect(path, timeout=5)
        connection.row_factory = sqlite3.Row
        return connection

    def _configure(self, connection: sqlite3.Connection) -> None:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute("PRAGMA synchronous = FULL")
        connection.execute("PRAGMA busy_timeout = 5000")

    def _ensure_migration_table(self, connection: sqlite3.Connection) -> None:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migration (
              version TEXT PRIMARY KEY,
              applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              checksum TEXT NOT NULL
            )
            """
        )
        connection.commit()

    @staticmethod
    def _table_exists(connection: sqlite3.Connection, table_name: str) -> bool:
        return (
            connection.execute(
                "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
                (table_name,),
            ).fetchone()
            is not None
        )

    def _load_migrations(self, database: str) -> list[Migration]:
        directory = self.migration_root / database
        files = sorted(directory.glob("*.sql"))
        if not files:
            raise RuntimeError(f"Nenhuma migração encontrada para {database}.sqlite")
        migrations = []
        for path in files:
            sql = path.read_text(encoding="utf-8")
            migrations.append(
                Migration(
                    version=path.stem,
                    path=path,
                    checksum=_sha256(sql.encode("utf-8")),
                    sql=sql,
                )
            )
        return migrations

    def _verify_applied_checksums(
        self,
        connection: sqlite3.Connection,
        migrations: Iterable[Migration],
        database: str,
    ) -> None:
        known_versions = {migration.version for migration in migrations}
        applied_versions = [
            row["version"]
            for row in connection.execute(
                "SELECT version FROM schema_migration ORDER BY version"
            ).fetchall()
        ]
        unknown_versions = [
            version for version in applied_versions if version not in known_versions
        ]
        if unknown_versions:
            raise RuntimeError(
                f"{database}.sqlite contém migração desconhecida para esta versão do aplicativo: "
                + ", ".join(unknown_versions)
            )
        for migration in migrations:
            row = connection.execute(
                "SELECT checksum FROM schema_migration WHERE version = ?",
                (migration.version,),
            ).fetchone()
            if row and row["checksum"] != migration.checksum:
                legacy_checksums = _LEGACY_MIGRATION_CHECKSUMS.get(database, {}).get(migration.version, frozenset())
                if row["checksum"] in legacy_checksums:
                    continue
                raise RuntimeError(
                    f"Migração imutável alterada em {database}.sqlite: {migration.version}"
                )

    def _pending_migrations(
        self,
        connection: sqlite3.Connection,
        migrations: Iterable[Migration],
    ) -> list[Migration]:
        return [
            migration
            for migration in migrations
            if connection.execute(
                "SELECT 1 FROM schema_migration WHERE version = ?",
                (migration.version,),
            ).fetchone()
            is None
        ]

    def _database_diagnostic(self, database: str) -> dict:
        path = self._database_path(database)
        if not path.exists():
            return {
                "name": path.name,
                "integrity": "not_initialized",
                "migration_versions": [],
            }
        with closing(self._connect(path)) as connection:
            self._configure(connection)
            if not self._table_exists(connection, "schema_migration"):
                return {
                    "name": path.name,
                    "integrity": self._integrity(connection),
                    "migration_versions": [],
                }
            versions = [
                row[0]
                for row in connection.execute(
                    "SELECT version FROM schema_migration ORDER BY version"
                ).fetchall()
            ]
            return {
                "name": path.name,
                "integrity": self._integrity(connection),
                "migration_versions": versions,
            }

    def _backup_connection(
        self,
        source: sqlite3.Connection,
        destination: Path,
    ) -> None:
        destination.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(destination)) as target:
            source.backup(target)
            integrity = self._integrity(target)
        if integrity != "ok":
            destination.unlink(missing_ok=True)
            raise RuntimeError(f"Backup criado com integridade inválida: {integrity}")

    def _backup_receipt(self, database: str, destination: Path) -> BackupReceipt:
        return BackupReceipt(
            database=database,
            filename=destination.name,
            created_at_utc=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            bytes=destination.stat().st_size,
            sha256=_sha256_file(destination),
        )

    def _database_path(self, database: str) -> Path:
        return self.data_dir / f"{database}.sqlite"

    def _backup_path(self, database: str, reason: str) -> Path:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        return self.backup_dir / reason / f"{database}-{timestamp}.sqlite"

    @staticmethod
    def _integrity(connection: sqlite3.Connection) -> str:
        return str(connection.execute("PRAGMA integrity_check").fetchone()[0])


def default_migration_root() -> Path:
    bundle_root = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    bundled = bundle_root / "migrations"
    if bundled.exists():
        return bundled
    return Path(__file__).resolve().parent / "src-tauri" / "migrations"


def embedded_editorial_snapshot_path() -> Path | None:
    configured = os.environ.get("AUREA_EDITORIAL_SNAPSHOT")
    if configured:
        return Path(configured)
    candidate = Path(__file__).resolve().parent / _EMBEDDED_EDITORIAL_RELATIVE_PATH
    if candidate.exists():
        return candidate
    bundle_candidate = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent)) / _EMBEDDED_EDITORIAL_RELATIVE_PATH
    if bundle_candidate.exists():
        return bundle_candidate
    return None


def _canonical_concept_type(category: str | None, name: str) -> str:
    """Map the editorial taxonomy to the deliberately small runtime enum."""
    normalized = f"{category or ''} {name}".casefold()
    if "planeta" in normalized:
        return "planet"
    if "sol" in normalized or "lua" in normalized or "luminar" in normalized:
        return "luminary"
    if "signo" in normalized or "zodiaco" in normalized or "zodíaco" in normalized:
        return "sign"
    if "casa" in normalized:
        return "house"
    if "aspect" in normalized or "paralelo" in normalized or "antisc" in normalized:
        return "aspect"
    if any(term in normalized for term in ("asteroide", "asteróide", "vertex", "nodo", "lote", "parte árabe", "parte arabe")):
        return "point"
    if any(term in normalized for term in ("previs", "direç", "direc", "progre", "revolu", "retorno", "profec", "trânsito", "transito", "ciclo")):
        return "timing"
    if "médic" in normalized or "medic" in normalized or "corpo" in normalized or "doença" in normalized or "doenca" in normalized:
        return "medical_astrology"
    if any(term in normalized for term in ("mapa", "sinastria", "composite", "davison")):
        return "chart_type"
    if any(term in normalized for term in ("técnica", "tecnica", "horária", "horaria", "eletiva")):
        return "technique"
    return "other"


def _canonical_concept_status(status: str | None) -> str:
    return {"review": "reviewed", "complete": "published"}.get((status or "").casefold(), "draft")


def _canonical_editorial_status(status: str | None) -> str:
    return {"review": "reviewed", "complete": "published"}.get((status or "").casefold(), "unreviewed")


def _canonical_relation_type(relation: str) -> str:
    return {
        "contradicts": "contradicts",
        "derives_from": "requires",
        "variant_of": "modifies",
        "supports": "related_to",
        "alias_of": "related_to",
        "summary_of": "related_to",
        "source_layer": "related_to",
    }.get(relation, "related_to")


def _relation_note(relation: str, note: str | None) -> str:
    prefix = f"Relação editorial original: {relation}."
    return f"{prefix} {note}" if note else prefix


def _sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def _validate_private_id(value: str, field: str) -> str:
    if not isinstance(value, str) or not _PRIVATE_ID_PATTERN.fullmatch(value):
        raise StorageValidationError(f"{field} inválido.")
    return value


def _validate_optional_private_id(value: str | None, field: str) -> str | None:
    if value is None:
        return None
    return _validate_private_id(value, field)


def _validate_text(value: str, field: str, *, maximum: int) -> str:
    if not isinstance(value, str):
        raise StorageValidationError(f"{field} inválido.")
    normalized = value.strip()
    if not normalized or len(normalized) > maximum:
        raise StorageValidationError(f"{field} deve ter entre 1 e {maximum} caracteres.")
    return normalized


def _validate_optional_text(value: str | None, field: str, *, maximum: int) -> str | None:
    if value is None:
        return None
    return _validate_text(value, field, maximum=maximum)


def _validate_limit(value: int, *, maximum: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 1 or value > maximum:
        raise StorageValidationError(f"limit deve estar entre 1 e {maximum}.")
    return value


def _validate_source_refs(source_refs: list[str] | None) -> list[str]:
    if source_refs is None:
        return []
    if not isinstance(source_refs, list) or len(source_refs) > 50:
        raise StorageValidationError("source_refs inválido.")
    return [_validate_text(value, "source_refs", maximum=500) for value in source_refs]


def _thread_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "owner_id": row["owner_id"],
        "title": row["title"],
        "topic_key": row["topic_key"],
        "subject_context": json.loads(row["subject_context_json"]),
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _message_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "owner_id": row["owner_id"],
        "thread_id": row["thread_id"],
        "role": row["role"],
        "content": row["content"],
        "provenance_kind": row["provenance_kind"],
        "calculation_receipt_hash": row["calculation_receipt_hash"],
        "source_refs": json.loads(row["source_refs_json"]),
        "created_at": row["created_at"],
    }


def _memory_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "owner_id": row["owner_id"],
        "memory_type": row["memory_type"],
        "content": row["content"],
        "evidence_note": row["evidence_note"],
        "status": row["status"],
        "topic_key": row["topic_key"],
        "subject_kind": row["subject_kind"],
        "subject_ref": row["subject_ref"],
        "source_thread_id": row["source_thread_id"],
        "source_message_id": row["source_message_id"],
        "confidence": row["confidence"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "approved_at": row["approved_at"],
        "revoked_at": row["revoked_at"],
        "deleted_at": row["deleted_at"],
    }


_storage: LocalStorage | None = None
_storage_lock = RLock()


def get_storage() -> LocalStorage:
    global _storage
    with _storage_lock:
        if _storage is None:
            _storage = LocalStorage.from_environment()
            _storage.initialize()
        return _storage
