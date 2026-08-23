from __future__ import annotations

import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]

REMOVED_PATHS = (
    "main_api.py",
    "browser_workspace.py",
    "local_storage.py",
    "persistence",
    "src-tauri",
    "build.bat",
    "build_sidecar.spec",
    "launch_chrome.bat",
    "launch_chrome.ps1",
    "run_tauri.bat",
    "start-dev.bat",
    "requirements-api.txt",
    "tools/clean-generated.ps1",
    "tools/seed_test_user.py",
    "apps/web/src/utils/tauri.ts",
    "docs/tauri-ipc-api.md",
)

CURRENT_TEXT_TARGETS = (
    ".github/workflows",
    "apps/web/src",
    "tools/run_e2e.py",
    "package.json",
    "apps/web/package.json",
    "package-lock.json",
    ".env.example",
    "README.md",
    "AGENTS.md",
    "docs/AI_WORKING_GUIDE.md",
    "docs/setup-guide.md",
    "docs/index.md",
    "services/api/README.md",
)

RETIRED_MARKERS = (
    "main_api.py",
    "src-tauri",
    "127.0.0.1:9876",
    "127.0.0.1:9878",
    "local-owner",
    "/browser/command",
    "launch_chrome",
    "run_tauri",
    "build_sidecar",
    "npm run tauri",
    "@tauri-apps/",
    "pyinstaller",
    "sidecar",
    "aurea_data_dir",
    "aurea_sidecar_token",
    "aurea_session_secret",
    "cargo_target_dir",
)

TEXT_SUFFIXES = {".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".yml", ".yaml", ".md", ".toml", ".sh"}


def _iter_current_text_files() -> list[Path]:
    files: list[Path] = []
    for relative in CURRENT_TEXT_TARGETS:
        path = REPO_ROOT / relative
        if path.is_file():
            files.append(path)
            continue
        files.extend(
            candidate
            for candidate in path.rglob("*")
            if candidate.is_file() and candidate.suffix.lower() in TEXT_SUFFIXES
        )
    return files


class LegacyRuntimeRetirementTests(unittest.TestCase):
    def test_retired_runtime_paths_are_absent(self) -> None:
        remaining = [relative for relative in REMOVED_PATHS if (REPO_ROOT / relative).exists()]
        self.assertEqual(remaining, [], f"retired runtime paths reappeared: {remaining}")

    def test_current_runtime_targets_do_not_reference_retired_contracts(self) -> None:
        violations: list[str] = []
        for path in _iter_current_text_files():
            text = path.read_text(encoding="utf-8").lower()
            for marker in RETIRED_MARKERS:
                if marker.lower() in text:
                    violations.append(f"{path.relative_to(REPO_ROOT)}: {marker}")
        self.assertEqual(violations, [], "retired runtime markers found in current targets:\n" + "\n".join(violations))


if __name__ == "__main__":
    unittest.main()
