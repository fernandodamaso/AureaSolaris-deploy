from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]
_MIN_SAFE_VITE = (7, 3, 5)
_VERSION_PREFIX = re.compile(r"^[~^]?([0-9]+)\.([0-9]+)\.([0-9]+)")


def _version_tuple(value: str) -> tuple[int, int, int]:
    match = _VERSION_PREFIX.match(value)
    if match is None:
        raise AssertionError(f"Unsupported Vite version expression: {value!r}")
    return tuple(int(part) for part in match.groups())  # type: ignore[return-value]


class WebDependencySecurityFloorTests(unittest.TestCase):
    def test_vite_manifest_and_lockfile_are_past_known_dev_server_advisory_floor(self) -> None:
        manifest = json.loads((_REPO_ROOT / "apps/web/package.json").read_text(encoding="utf-8"))
        lockfile = json.loads((_REPO_ROOT / "package-lock.json").read_text(encoding="utf-8"))

        manifest_vite = manifest["devDependencies"]["vite"]
        locked_vite = lockfile["packages"]["node_modules/vite"]["version"]

        self.assertGreaterEqual(
            _version_tuple(manifest_vite),
            _MIN_SAFE_VITE,
            "Vite dependency range must not admit the known vulnerable 7.0.0-7.3.4 floor.",
        )
        self.assertGreaterEqual(
            _version_tuple(locked_vite),
            _MIN_SAFE_VITE,
            "package-lock.json must resolve Vite to 7.3.5 or newer.",
        )


if __name__ == "__main__":
    unittest.main()
