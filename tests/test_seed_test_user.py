import importlib.util
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

_SEED_MODULE_PATH = REPO_ROOT / "tools" / "seed_test_user.py"
_spec = importlib.util.spec_from_file_location("seed_test_user", _SEED_MODULE_PATH)
assert _spec and _spec.loader
seed_test_user_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(seed_test_user_module)
seed_test_user = seed_test_user_module.seed_test_user

from browser_workspace import (  # noqa: E402
    list_boards,
    load_board,
    load_health_memory,
    list_diary_entries,
    list_diary_folders,
)
from local_storage import LocalStorage  # noqa: E402

OWNER_ID = "aurea-test"
SEED_VERSION = "1"


class TestSeedTestUser(unittest.TestCase):
    def _with_data_dir(self, data_dir: Path):
        return patch.dict(os.environ, {"AUREA_DATA_DIR": str(data_dir)}, clear=False)

    def test_seeds_full_dummy_life(self):
        with tempfile.TemporaryDirectory() as directory:
            data_dir = Path(directory) / "test-data"
            with self._with_data_dir(data_dir):
                seed_test_user(data_dir)

                storage = LocalStorage(data_dir)
                accounts = storage.list_private_accounts_for_bootstrap()
                self.assertEqual(len(accounts), 1)
                self.assertEqual(accounts[0]["account_id"], OWNER_ID)
                self.assertEqual(accounts[0]["display_name"], "Pessoa Teste")
                self.assertFalse(accounts[0]["disabled"])

                boards = list_boards(OWNER_ID)
                self.assertEqual(len(boards), 1)
                self.assertEqual(boards[0]["id"], "caderno-teste")

                board = load_board(OWNER_ID, "caderno-teste")
                self.assertEqual(len(board["nodes"]), 2)
                self.assertEqual(len(board["edges"]), 1)
                self.assertEqual(board["edges"][0]["from"], 1)
                self.assertEqual(board["edges"][0]["to"], 2)

                folders = list_diary_folders(OWNER_ID)
                self.assertTrue(any(folder["name"] == "Estudo" for folder in folders))

                entries = list_diary_entries(OWNER_ID)
                self.assertEqual(len(entries), 1)
                self.assertEqual(entries[0]["title"], "Primeira anotacao de teste")
                self.assertTrue(entries[0].get("content"))

                health = load_health_memory(OWNER_ID, "aurea-reference-natal")
                self.assertEqual(len(health), 1)
                self.assertIn("teste", health[0]["fileName"].lower())

                threads = storage.list_hermes_threads(OWNER_ID)
                self.assertEqual(len(threads), 1)
                self.assertEqual(threads[0]["topic_key"], "estudo-teste")

                memories = storage.list_hermes_memories(OWNER_ID)
                self.assertEqual(len(memories), 2)
                statuses = {memory["status"] for memory in memories}
                self.assertEqual(statuses, {"proposed", "approved"})

                marker = data_dir / "memory" / "owners" / OWNER_ID / ".seed-version"
                self.assertTrue(marker.is_file())
                self.assertEqual(marker.read_text(encoding="utf-8").strip(), SEED_VERSION)

    def test_second_run_is_no_op(self):
        with tempfile.TemporaryDirectory() as directory:
            data_dir = Path(directory) / "test-data"
            with self._with_data_dir(data_dir):
                seed_test_user(data_dir)
                seed_test_user(data_dir)

                storage = LocalStorage(data_dir)
                self.assertEqual(len(list_boards(OWNER_ID)), 1)
                self.assertEqual(len(storage.list_hermes_threads(OWNER_ID)), 1)
                self.assertEqual(len(storage.list_hermes_memories(OWNER_ID)), 2)

    def test_refuses_real_personal_data_directory(self):
        with tempfile.TemporaryDirectory() as fake_local_app_data:
            personal = Path(fake_local_app_data) / "Aurea Solaris" / "data"
            personal_existed = personal.exists()
            before_listing = set(personal.rglob("*")) if personal_existed else set()

            with patch.dict(os.environ, {"LOCALAPPDATA": fake_local_app_data}, clear=False):
                with self.assertRaises(ValueError) as context:
                    seed_test_user(personal)

            message = str(context.exception).lower()
            self.assertIn("forbidden", message)

            if personal_existed:
                after_listing = set(personal.rglob("*"))
                self.assertEqual(before_listing, after_listing)
            else:
                self.assertFalse(personal.exists())


if __name__ == "__main__":
    unittest.main()
