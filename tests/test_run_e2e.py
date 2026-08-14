from __future__ import annotations

import importlib.util
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parents[1]
_SPEC = importlib.util.spec_from_file_location("run_e2e", REPO_ROOT / "tools" / "run_e2e.py")
run_e2e = importlib.util.module_from_spec(_SPEC)
assert _SPEC.loader is not None
_SPEC.loader.exec_module(run_e2e)


class TestRunE2EHelpers(unittest.TestCase):
    def test_refuse_personal_data_dir_on_windows_layout(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            local = Path(tmp) / "Local"
            personal = local / "Aurea Solaris" / "data"
            personal.mkdir(parents=True)
            with patch.dict(os.environ, {"LOCALAPPDATA": str(local)}, clear=False):
                self.assertTrue(run_e2e.is_forbidden_personal_data_dir(personal))
                self.assertTrue(run_e2e.is_forbidden_personal_data_dir(personal / "nested"))
                self.assertFalse(run_e2e.is_forbidden_personal_data_dir(local / "Aurea Solaris" / "test-user" / "data"))

    def test_wait_for_test_user_health_rejects_non_test(self) -> None:
        class FakeResponse:
            status_code = 200

            def json(self):
                return {"status": "ok", "test_user": False, "auth_mode": "local-owner", "browser_contract_version": 2}

        with patch.object(run_e2e, "http_get_json", return_value=FakeResponse().json()):
            with self.assertRaises(RuntimeError) as ctx:
                run_e2e.wait_for_test_user_health("http://127.0.0.1:9876", timeout_s=0.1)
            self.assertIn("test_user", str(ctx.exception).lower())


if __name__ == "__main__":
    unittest.main()
