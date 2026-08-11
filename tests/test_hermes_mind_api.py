import sqlite3
import os
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import main_api
from local_storage import LocalStorage


MIGRATIONS = Path(__file__).resolve().parents[1] / "src-tauri" / "migrations"
os.environ.setdefault("AUREA_SIDECAR_TOKEN", "test-token")


class HermesMindApiTests(unittest.TestCase):
    def make_storage(self, root: Path) -> LocalStorage:
        storage = LocalStorage(root / "app-data" / "data", MIGRATIONS)
        storage.initialize()
        with closing(sqlite3.connect(storage.data_dir / "private.sqlite")) as connection:
            connection.execute(
                """
                INSERT INTO account(id, display_name, login_name, password_verifier, password_salt)
                VALUES ('owner-1', 'Pessoa', 'pessoa', 'verifier', 'salt')
                """
            )
            connection.commit()
        return storage

    def test_reopens_private_context_and_does_not_leak_it_from_health(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = self.make_storage(Path(directory))
            with patch.object(main_api, "get_storage", return_value=storage):
                with TestClient(main_api.app, headers={"X-Aurea-Sidecar-Token": "test-token"}) as client:
                    opened = client.post(
                        "/hermes/threads/open",
                        json={"owner_id": "owner-1", "topic_key": "sinastria", "title": "Sinastria"},
                    )
                    self.assertEqual(opened.status_code, 200)
                    thread_id = opened.json()["thread"]["id"]

                    saved = client.post(
                        f"/hermes/threads/{thread_id}/messages",
                        json={
                            "owner_id": "owner-1",
                            "role": "user",
                            "content": "Quero retomar este estudo.",
                            "provenance_kind": "personal_statement",
                        },
                    )
                    self.assertEqual(saved.status_code, 200)

                    context = client.get(
                        f"/hermes/threads/{thread_id}/context",
                        params={"owner_id": "owner-1"},
                    )
                    self.assertEqual(context.status_code, 200)
                    self.assertEqual(context.json()["messages"][0]["content"], "Quero retomar este estudo.")

                    foreign = client.get(
                        f"/hermes/threads/{thread_id}/context",
                        params={"owner_id": "owner-2"},
                    )
                    self.assertEqual(foreign.status_code, 404)

                    health = client.get("/health")
                    self.assertEqual(health.status_code, 200)
                    self.assertNotIn("Quero retomar este estudo.", health.text)
                    self.assertNotIn(thread_id, health.text)

    def test_account_creation_is_explicit_and_enables_owned_thread(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = LocalStorage(Path(directory) / "app-data" / "data", MIGRATIONS)
            storage.initialize()
            with patch.object(main_api, "get_storage", return_value=storage):
                with TestClient(main_api.app, headers={"X-Aurea-Sidecar-Token": "test-token"}) as client:
                    created = client.post(
                        "/hermes/accounts",
                        json={
                            "account_id": "owner-1",
                            "display_name": "Pessoa",
                            "login_name": "pessoa",
                            "password": "a sufficiently strong test password",
                        },
                    )
                    self.assertEqual(created.status_code, 200)
                    opened = client.post(
                        "/hermes/threads/open",
                        json={"owner_id": "owner-1", "topic_key": "mapa-natal"},
                    )
                    self.assertEqual(opened.status_code, 200)

    def test_argon2_register_login_and_private_route_gate(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = LocalStorage(Path(directory) / "app-data" / "data", MIGRATIONS)
            storage.initialize()
            with patch.object(main_api, "get_storage", return_value=storage):
                with TestClient(main_api.app, headers={"X-Aurea-Sidecar-Token": "test-token"}) as client:
                    body = {
                        "account_id": "owner-argon",
                        "display_name": "Pessoa",
                        "login_name": "argon",
                        "password": "a sufficiently strong test password",
                    }
                    self.assertEqual(client.post("/hermes/auth/register", json=body).status_code, 200)
                    login = client.post(
                        "/hermes/auth/login",
                        json={"login_name": "argon", "password": body["password"]},
                    )
                    self.assertEqual(login.status_code, 200)
                    self.assertEqual(login.json()["account_id"], "owner-argon")
                    with TestClient(main_api.app) as unauthenticated:
                        self.assertEqual(
                            unauthenticated.post(
                            "/hermes/threads/open",
                            json={"owner_id": "owner-argon", "topic_key": "private"},
                            ).status_code,
                            401,
                        )
                    with closing(sqlite3.connect(storage.data_dir / "private.sqlite")) as connection:
                        algorithm, verifier = connection.execute(
                            "SELECT password_algorithm, password_verifier FROM account WHERE id = 'owner-argon'"
                        ).fetchone()
                    self.assertEqual(algorithm, "argon2id")
                    self.assertTrue(verifier.startswith("$argon2id$"))

    def test_knowledge_endpoint_reads_the_canonical_import(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = self.make_storage(Path(directory))
            with patch.object(main_api, "get_storage", return_value=storage):
                with TestClient(main_api.app, headers={"X-Aurea-Sidecar-Token": "test-token"}) as client:
                    diagnostic = client.get("/storage/diagnostic")
                    self.assertEqual(diagnostic.status_code, 200)
                    self.assertEqual(diagnostic.json()["editorial_import"]["status"], "installed")

                    response = client.get(
                        "/knowledge/search",
                        params={"query": "planeta", "types": "concept", "limit": 10},
                    )
                    self.assertEqual(response.status_code, 200)
                    self.assertGreater(len(response.json()["concepts"]), 0)

    def test_memory_api_supports_review_and_forget(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = self.make_storage(Path(directory))
            with patch.object(main_api, "get_storage", return_value=storage):
                with TestClient(main_api.app, headers={"X-Aurea-Sidecar-Token": "test-token"}) as client:
                    opened = client.post(
                        "/hermes/threads/open",
                        json={"owner_id": "owner-1", "topic_key": "sinastria", "title": "Sinastria"},
                    )
                    thread_id = opened.json()["thread"]["id"]
                    saved = client.post(
                        f"/hermes/threads/{thread_id}/messages",
                        json={
                            "owner_id": "owner-1",
                            "role": "user",
                            "content": "Quero retomar este estudo.",
                            "provenance_kind": "personal_statement",
                        },
                    )
                    proposed = client.post(
                        "/hermes/memories/propose",
                        json={
                            "owner_id": "owner-1",
                            "content": "Sinastria é um fio recorrente de estudo.",
                            "memory_type": "study_note",
                            "source_thread_id": thread_id,
                            "source_message_id": saved.json()["id"],
                            "confidence": "inferred",
                        },
                    )
                    self.assertEqual(proposed.status_code, 200)
                    memory_id = proposed.json()["id"]
                    approved = client.post(
                        f"/hermes/memories/{memory_id}/review",
                        json={"owner_id": "owner-1", "decision": "approve"},
                    )
                    self.assertEqual(approved.status_code, 200)
                    self.assertEqual(approved.json()["confidence"], "confirmed")
                    forgotten = client.post(
                        f"/hermes/memories/{memory_id}/review",
                        json={"owner_id": "owner-1", "decision": "forget"},
                    )
                    self.assertEqual(forgotten.status_code, 200)
                    self.assertTrue(forgotten.json()["deleted"])
                    self.assertEqual(
                        client.get("/hermes/memories", params={"owner_id": "owner-1"}).json()["memories"], []
                    )


if __name__ == "__main__":
    unittest.main()
