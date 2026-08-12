import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import main_api
from local_storage import LocalStorage


MIGRATIONS = Path(__file__).resolve().parents[1] / "src-tauri" / "migrations"


class TestBrowserRuntime(unittest.TestCase):
    def test_browser_smoke_detects_wildcard_listeners(self):
        smoke_source = (Path(__file__).with_name("browser_runtime_smoke.ps1")).read_text(encoding="utf-8")
        self.assertIn("Get-NetTCPConnection -State Listen", smoke_source)
        self.assertNotIn("Get-NetTCPConnection -LocalAddress 127.0.0.1", smoke_source)

    def test_packaged_frontend_is_declared_and_mounted_after_health(self):
        repository_root = Path(__file__).resolve().parents[1]
        spec_source = (repository_root / "build_sidecar.spec").read_text(encoding="utf-8")
        api_source = (repository_root / "main_api.py").read_text(encoding="utf-8")

        self.assertRegex(spec_source, r"(?m)^frontend_datas = \[\('dist', 'dist'\)\]\s*$")
        health_route = api_source.index('@app.get("/health")')
        frontend_mount = api_source.index('app.mount("/", StaticFiles')
        self.assertLess(health_route, frontend_mount)

    def test_browser_session_gates_private_workspace_and_keeps_owner_scope(self):
        with tempfile.TemporaryDirectory() as directory:
            data_dir = Path(directory) / "browser-data"
            storage = LocalStorage(Path(directory) / "app-data" / "data", MIGRATIONS)
            storage.initialize()
            with patch.dict(os.environ, {"AUREA_DATA_DIR": str(data_dir)}, clear=False):
                with patch.object(main_api, "get_storage", return_value=storage):
                    with TestClient(main_api.app) as client:
                        unauthenticated = client.post(
                            "/browser/command",
                            json={"command": "list_boards", "args": {}},
                        )
                        self.assertEqual(unauthenticated.status_code, 401)

                        registered = client.post(
                            "/browser/command",
                            json={
                                "command": "private_account_register",
                                "args": {
                                    "ownerId": "browser-owner",
                                    "displayName": "Pessoa local",
                                    "loginName": "pessoa-local",
                                    "password": "uma senha local suficientemente forte",
                                },
                            },
                        )
                        self.assertEqual(registered.status_code, 200)
                        session = registered.json()["browser_session_token"]
                        headers = {"X-Aurea-Browser-Session": session}

                        saved = client.post(
                            "/browser/command",
                            headers=headers,
                            json={
                                "command": "save_board",
                                "args": {"boardId": "board-1", "name": "Estudo", "nodes": [{"id": 1}], "edges": []},
                            },
                        )
                        self.assertEqual(saved.status_code, 200)
                        loaded = client.post(
                            "/browser/command",
                            headers=headers,
                            json={"command": "load_board", "args": {"boardId": "board-1"}},
                        )
                        self.assertEqual(loaded.status_code, 200)
                        self.assertEqual(loaded.json()["result"]["owner_id"], "browser-owner")
                        self.assertEqual(loaded.json()["result"]["nodes"], [{"id": 1}])

                        diary = client.post(
                            "/browser/command",
                            headers=headers,
                            json={"command": "diary_create_entry", "args": {"title": "Nota privada"}},
                        )
                        self.assertEqual(diary.status_code, 200)
                        self.assertEqual(diary.json()["result"]["owner_id"], "browser-owner")

                        closed = client.post(
                            "/browser/command",
                            headers=headers,
                            json={"command": "private_session_close", "args": {}},
                        )
                        self.assertEqual(closed.status_code, 200)
                        after_close = client.post(
                            "/browser/command",
                            headers=headers,
                            json={"command": "list_boards", "args": {}},
                        )
                        self.assertEqual(after_close.status_code, 401)

    def test_browser_pdf_endpoint_requires_session_for_uploaded_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = LocalStorage(Path(directory) / "app-data" / "data", MIGRATIONS)
            storage.initialize()
            with patch.object(main_api, "get_storage", return_value=storage):
                with TestClient(main_api.app) as client:
                    denied = client.post(
                        "/extract_pdf",
                        content=b"%PDF-invalid",
                        headers={"Content-Type": "application/pdf"},
                    )
                    self.assertEqual(denied.status_code, 401)

    def test_browser_owner_cannot_read_update_or_delete_foreign_workspace_records(self):
        with tempfile.TemporaryDirectory() as directory:
            data_dir = Path(directory) / "browser-data"
            storage = LocalStorage(Path(directory) / "app-data" / "data", MIGRATIONS)
            storage.initialize()
            with patch.dict(os.environ, {"AUREA_DATA_DIR": str(data_dir)}, clear=False):
                with patch.object(main_api, "get_storage", return_value=storage):
                    with TestClient(main_api.app) as client:
                        owner_a = client.post(
                            "/browser/command",
                            json={
                                "command": "private_account_register",
                                "args": {
                                    "ownerId": "browser-owner-a",
                                    "displayName": "Pessoa A",
                                    "loginName": "pessoa-a",
                                    "password": "senha local A suficientemente forte",
                                },
                            },
                        ).json()["browser_session_token"]
                        owner_b = client.post(
                            "/browser/command",
                            json={
                                "command": "private_account_register",
                                "args": {
                                    "ownerId": "browser-owner-b",
                                    "displayName": "Pessoa B",
                                    "loginName": "pessoa-b",
                                    "password": "senha local B suficientemente forte",
                                },
                            },
                        ).json()["browser_session_token"]

                        board = client.post(
                            "/browser/command",
                            headers={"X-Aurea-Browser-Session": owner_b},
                            json={
                                "command": "save_board",
                                "args": {
                                    "boardId": "foreign-board",
                                    "name": "Caderno de B",
                                    "nodes": [{"text": "conteudo privado de B"}],
                                    "edges": [],
                                },
                            },
                        )
                        self.assertEqual(board.status_code, 200)
                        entry = client.post(
                            "/browser/command",
                            headers={"X-Aurea-Browser-Session": owner_b},
                            json={
                                "command": "diary_create_entry",
                                "args": {"title": "Nota privada de B"},
                            },
                        ).json()["result"]

                        headers_a = {"X-Aurea-Browser-Session": owner_a}
                        foreign_board = client.post(
                            "/browser/command",
                            headers=headers_a,
                            json={
                                "command": "load_board",
                                "args": {"boardId": "foreign-board"},
                            },
                        )
                        self.assertEqual(foreign_board.status_code, 200)
                        self.assertEqual(foreign_board.json()["result"]["nodes"], [])

                        foreign_entry = client.post(
                            "/browser/command",
                            headers=headers_a,
                            json={
                                "command": "diary_get_entry",
                                "args": {"id": entry["id"]},
                            },
                        )
                        self.assertEqual(foreign_entry.status_code, 200)
                        self.assertIsNone(foreign_entry.json()["result"])

                        updated = client.post(
                            "/browser/command",
                            headers=headers_a,
                            json={
                                "command": "diary_update_entry",
                                "args": {"id": entry["id"], "title": "Tentativa de A"},
                            },
                        )
                        self.assertEqual(updated.status_code, 404)

                        deleted_board = client.post(
                            "/browser/command",
                            headers=headers_a,
                            json={
                                "command": "delete_board",
                                "args": {"boardId": "foreign-board"},
                            },
                        )
                        self.assertEqual(deleted_board.status_code, 200)
                        deleted_entry = client.post(
                            "/browser/command",
                            headers=headers_a,
                            json={
                                "command": "diary_delete_entry",
                                "args": {"id": entry["id"]},
                            },
                        )
                        self.assertEqual(deleted_entry.status_code, 200)

                        headers_b = {"X-Aurea-Browser-Session": owner_b}
                        board_after_attempt = client.post(
                            "/browser/command",
                            headers=headers_b,
                            json={
                                "command": "load_board",
                                "args": {"boardId": "foreign-board"},
                            },
                        )
                        self.assertEqual(
                            board_after_attempt.json()["result"]["nodes"],
                            [{"text": "conteudo privado de B"}],
                        )
                        entry_after_attempt = client.post(
                            "/browser/command",
                            headers=headers_b,
                            json={
                                "command": "diary_get_entry",
                                "args": {"id": entry["id"]},
                            },
                        )
                        self.assertEqual(entry_after_attempt.status_code, 200)
                        self.assertEqual(entry_after_attempt.json()["result"]["title"], "Nota privada de B")


if __name__ == "__main__":
    unittest.main()
