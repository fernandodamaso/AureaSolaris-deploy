import sqlite3
import shutil
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

from local_storage import LocalStorage


MIGRATIONS = Path(__file__).resolve().parents[1] / "src-tauri" / "migrations"


class LocalStorageTests(unittest.TestCase):
    def make_storage(self, root: Path) -> LocalStorage:
        return LocalStorage(root / "app-data" / "data", MIGRATIONS)

    @staticmethod
    def add_owner(storage: LocalStorage, owner_id: str) -> None:
        with closing(sqlite3.connect(storage.data_dir / "private.sqlite")) as connection:
            connection.execute(
                """
                INSERT INTO account(id, display_name, login_name, password_verifier, password_salt)
                VALUES (?, ?, ?, 'verifier', 'salt')
                """,
                (owner_id, owner_id, owner_id),
            )
            connection.commit()

    def test_creates_databases_and_installs_bundled_editorial_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = self.make_storage(Path(directory))
            diagnostic = storage.initialize()

            self.assertEqual(diagnostic["private_database"]["integrity"], "ok")
            self.assertEqual(diagnostic["knowledge_database"]["integrity"], "ok")
            self.assertEqual(len(diagnostic["private_database"]["migration_versions"]), 5)
            self.assertEqual(len(diagnostic["knowledge_database"]["migration_versions"]), 1)
            self.assertEqual(diagnostic["legacy_import_status"], "installed")
            self.assertEqual(diagnostic["editorial_import"]["status"], "installed")
            self.assertGreater(diagnostic["editorial_import"]["content_items"], 0)

            with closing(sqlite3.connect(storage.data_dir / "private.sqlite")) as connection:
                self.assertEqual(connection.execute("SELECT COUNT(*) FROM account").fetchone()[0], 0)
                self.assertIsNotNone(connection.execute(
                    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='hermes_thread'"
                ).fetchone())
                self.assertIsNotNone(connection.execute(
                    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='hermes_contradiction_review'"
                ).fetchone())

            with closing(sqlite3.connect(storage.data_dir / "knowledge.sqlite")) as connection:
                self.assertGreater(connection.execute("SELECT COUNT(*) FROM concept").fetchone()[0], 0)
                self.assertGreater(connection.execute("SELECT COUNT(*) FROM claim").fetchone()[0], 0)
                self.assertEqual(connection.execute("SELECT COUNT(*) FROM import_manifest").fetchone()[0], 1)

            # The second initialization must recognize the same immutable
            # snapshot instead of duplicating canonical records.
            storage.initialize()
            with closing(sqlite3.connect(storage.data_dir / "knowledge.sqlite")) as connection:
                self.assertEqual(connection.execute("SELECT COUNT(*) FROM import_manifest").fetchone()[0], 1)

    def test_searches_installed_snapshot_from_canonical_database(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = self.make_storage(Path(directory))
            storage.initialize()

            # If canonical search were empty, this replacement would make the
            # test fail. A matching term must therefore come from knowledge.sqlite.
            storage._search_embedded_editorial_snapshot = lambda *args, **kwargs: (_ for _ in ()).throw(
                AssertionError("fallback snapshot should not be queried after installation")
            )
            result = storage.search_knowledge("planeta", limit=10, types=["concept"])
            self.assertGreater(len(result["concepts"]), 0)

    def test_explicit_account_creation_never_receives_plaintext_password(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = self.make_storage(Path(directory))
            storage.initialize()
            result = storage.create_private_account(
                account_id="owner-1",
                display_name="Pessoa",
                login_name="pessoa",
                password_verifier="derived-verifier",
                password_salt="derived-salt",
                password_algorithm="PBKDF2-SHA-256",
            )
            self.assertTrue(result["created"])
            self.assertEqual(storage.create_private_account(
                "owner-1", "Pessoa", "pessoa", "derived-verifier", "derived-salt", "PBKDF2-SHA-256"
            )["created"], False)
            with closing(sqlite3.connect(storage.data_dir / "private.sqlite")) as connection:
                row = connection.execute(
                    "SELECT password_verifier, password_salt, password_algorithm FROM account WHERE id = 'owner-1'"
                ).fetchone()
            self.assertEqual(row, ("derived-verifier", "derived-salt", "PBKDF2-SHA-256"))

    def test_refuses_an_applied_migration_with_changed_checksum(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = self.make_storage(Path(directory))
            storage.initialize()
            with closing(sqlite3.connect(storage.data_dir / "private.sqlite")) as connection:
                connection.execute(
                    "UPDATE schema_migration SET checksum = 'altered' WHERE version = '0001_initial'"
                )
                connection.commit()

            with self.assertRaisesRegex(RuntimeError, "Migração imutável alterada"):
                storage.initialize()

    def test_refuses_database_created_by_unknown_future_migration(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = self.make_storage(Path(directory))
            storage.initialize()
            with closing(sqlite3.connect(storage.data_dir / "private.sqlite")) as connection:
                connection.execute(
                    "INSERT INTO schema_migration(version, checksum) VALUES ('9999_future', 'hash')"
                )
                connection.commit()

            with self.assertRaisesRegex(RuntimeError, "migração desconhecida"):
                storage.initialize()

    def test_manual_backup_is_verified_and_has_receipt(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = self.make_storage(Path(directory))
            storage.initialize()
            receipt = storage.backup_private()
            backup = storage.backup_dir / "manual" / receipt["filename"]

            self.assertTrue(backup.exists())
            self.assertGreater(receipt["bytes"], 0)
            self.assertEqual(len(receipt["sha256"]), 64)
            with closing(sqlite3.connect(backup)) as connection:
                self.assertEqual(connection.execute("PRAGMA integrity_check").fetchone()[0], "ok")

    def test_hermes_mind_cannot_link_records_across_owners(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = self.make_storage(Path(directory))
            storage.initialize()
            with closing(sqlite3.connect(storage.data_dir / "private.sqlite")) as connection:
                connection.execute("PRAGMA foreign_keys = ON")
                for owner in ("owner-1", "owner-2"):
                    connection.execute(
                        """
                        INSERT INTO account(
                          id, display_name, login_name, password_verifier, password_salt
                        ) VALUES (?, ?, ?, 'verifier', 'salt')
                        """,
                        (owner, owner, owner),
                    )
                connection.execute(
                    "INSERT INTO hermes_thread(id, owner_id, title) VALUES ('thread-1', 'owner-1', 'Sinastria')"
                )
                with self.assertRaises(sqlite3.IntegrityError):
                    connection.execute(
                        """
                        INSERT INTO hermes_message(
                          id, owner_id, thread_id, role, content, provenance_kind
                        ) VALUES ('message-cross-owner', 'owner-2', 'thread-1', 'user', 'texto', 'personal_statement')
                        """
                    )

    def test_schema_upgrade_creates_backup_and_preserves_existing_rows(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            staged_migrations = root / "migrations"
            (staged_migrations / "private").mkdir(parents=True)
            (staged_migrations / "knowledge").mkdir(parents=True)
            shutil.copy(MIGRATIONS / "private" / "0001_initial.sql", staged_migrations / "private")
            shutil.copy(MIGRATIONS / "knowledge" / "0001_initial.sql", staged_migrations / "knowledge")

            storage = LocalStorage(root / "app-data" / "data", staged_migrations)
            storage.initialize()
            with closing(sqlite3.connect(storage.data_dir / "private.sqlite")) as connection:
                connection.execute(
                    """
                    INSERT INTO account(
                      id, display_name, login_name, password_verifier, password_salt
                    ) VALUES ('a1', 'Test', 'test', 'verifier', 'salt')
                    """
                )
                connection.commit()

            shutil.copy(
                MIGRATIONS / "private" / "0002_personal_library_and_attachments.sql",
                staged_migrations / "private",
            )
            shutil.copy(
                MIGRATIONS / "private" / "0003_ai_provider_preferences.sql",
                staged_migrations / "private",
            )
            shutil.copy(
                MIGRATIONS / "private" / "0004_plan_time_and_audit.sql",
                staged_migrations / "private",
            )
            shutil.copy(
                MIGRATIONS / "private" / "0005_hermes_mind.sql",
                staged_migrations / "private",
            )
            storage.initialize()

            backups = list((storage.backup_dir / "before-schema").glob("private-*.sqlite"))
            self.assertEqual(len(backups), 1)
            with closing(sqlite3.connect(storage.data_dir / "private.sqlite")) as connection:
                self.assertEqual(connection.execute("SELECT COUNT(*) FROM account").fetchone()[0], 1)
            with closing(sqlite3.connect(backups[0])) as connection:
                self.assertEqual(connection.execute("SELECT COUNT(*) FROM account").fetchone()[0], 1)

    def test_hermes_thread_reopens_by_owner_and_topic_with_classified_context(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = self.make_storage(Path(directory))
            storage.initialize()
            self.add_owner(storage, "owner-1")

            first = storage.open_hermes_thread("owner-1", "sinastria:ana-e-bruno", "Sinastria")
            self.assertTrue(first["created"])
            thread_id = first["thread"]["id"]
            message = storage.append_hermes_message(
                "owner-1",
                thread_id,
                "user",
                "Quero retomar nossa análise de sinastria.",
                "personal_statement",
                source_refs=["notebook:study-1"],
            )
            self.assertEqual(message["provenance_kind"], "personal_statement")
            self.assertEqual(message["source_refs"], ["notebook:study-1"])

            reopened = storage.open_hermes_thread("owner-1", "sinastria:ana-e-bruno")
            self.assertFalse(reopened["created"])
            self.assertEqual(reopened["thread"]["id"], thread_id)

            context = storage.get_hermes_thread_context("owner-1", thread_id)
            self.assertEqual(context["thread"]["topic_key"], "sinastria:ana-e-bruno")
            self.assertEqual([item["content"] for item in context["messages"]], [
                "Quero retomar nossa análise de sinastria."
            ])

    def test_hermes_context_never_crosses_owner_or_accepts_unclassified_message(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = self.make_storage(Path(directory))
            storage.initialize()
            self.add_owner(storage, "owner-1")
            self.add_owner(storage, "owner-2")
            thread = storage.open_hermes_thread("owner-1", "sinastria")["thread"]

            with self.assertRaisesRegex(LookupError, "Conversa Hermes não encontrada"):
                storage.get_hermes_thread_context("owner-2", thread["id"])
            with self.assertRaisesRegex(LookupError, "Conversa Hermes não encontrada"):
                storage.append_hermes_message(
                    "owner-2", thread["id"], "user", "texto", "personal_statement"
                )
            with self.assertRaisesRegex(ValueError, "provenance_kind inválido"):
                storage.append_hermes_message(
                    "owner-1", thread["id"], "user", "texto", "unknown_kind"
                )

    def test_hermes_memory_is_reviewable_and_forget_removes_it_from_recall(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = self.make_storage(Path(directory))
            storage.initialize()
            self.add_owner(storage, "owner-1")
            thread = storage.open_hermes_thread("owner-1", "sinastria", "Sinastria")["thread"]
            message = storage.append_hermes_message(
                "owner-1", thread["id"], "user", "Quero retomar a sinastria.", "personal_statement"
            )
            memory = storage.propose_hermes_memory(
                "owner-1",
                "A pessoa quer retomar estudos de sinastria como fio recorrente.",
                "study_note",
                topic_key="sinastria",
                source_thread_id=thread["id"],
                source_message_id=message["id"],
                confidence="inferred",
            )
            self.assertEqual(memory["status"], "proposed")
            approved = storage.review_hermes_memory("owner-1", memory["id"], "approve")
            self.assertEqual(approved["status"], "approved")
            self.assertEqual(approved["confidence"], "confirmed")
            forgotten = storage.review_hermes_memory("owner-1", memory["id"], "forget")
            self.assertTrue(forgotten["deleted"])
            self.assertEqual(storage.list_hermes_memories("owner-1"), [])

    def test_hermes_memory_cannot_use_foreign_message_as_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = self.make_storage(Path(directory))
            storage.initialize()
            self.add_owner(storage, "owner-1")
            self.add_owner(storage, "owner-2")
            thread = storage.open_hermes_thread("owner-1", "privado", "Privado")["thread"]
            message = storage.append_hermes_message(
                "owner-1", thread["id"], "user", "texto privado", "personal_statement"
            )
            with self.assertRaises(LookupError):
                storage.propose_hermes_memory(
                    "owner-2", "memoria", "study_note", source_message_id=message["id"]
                )


if __name__ == "__main__":
    unittest.main()
