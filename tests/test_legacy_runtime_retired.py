from __future__ import annotations

import re
import unittest
from pathlib import Path
from urllib.parse import unquote


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

# Active/current targets only. Historical evidence, archives, and deployment records
# intentionally stay outside this scan so they can preserve recovery context.
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
    "docs/CONSTITUICAO.md",
    "docs/AI_WORKING_GUIDE.md",
    "docs/arquitetura.md",
    "docs/data-persistence.md",
    "docs/data/DOMINIOS_DE_DADOS.md",
    "docs/data/WEB_V1_SCHEMA.md",
    "docs/setup-guide.md",
    "docs/CONFIGURACAO_DE_TRABALHO.md",
    "docs/index.md",
    "docs/operations/ENVIRONMENTS.md",
    "docs/operations/SUPABASE_RUNBOOK.md",
    "docs/operations/VERCEL_RUNBOOK.md",
    "docs/operations/VERCEL_API_RUNBOOK.md",
    "docs/operations/INCIDENT_AND_ROLLBACK.md",
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

RAILWAY_DEPLOYMENT_COMMANDS = (
    "railway up",
    "railway deploy",
    "railway run",
    "railway link",
)

TEXT_SUFFIXES = {".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".yml", ".yaml", ".md", ".toml", ".sh"}
MARKDOWN_LINK_RE = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")


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


def _local_markdown_target(source: Path, raw_target: str) -> Path | None:
    target = raw_target.strip()
    if not target or target.startswith(("#", "http://", "https://", "mailto:")):
        return None

    # Markdown links may use <path> or append an optional quoted title.
    if target.startswith("<") and ">" in target:
        target = target[1 : target.index(">")]
    else:
        target = target.split(maxsplit=1)[0]

    target = unquote(target).split("#", 1)[0].split("?", 1)[0]
    if not target:
        return None

    return (source.parent / target).resolve()


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

    def test_current_targets_do_not_deploy_web_v1_with_railway(self) -> None:
        violations: list[str] = []
        for path in _iter_current_text_files():
            text = path.read_text(encoding="utf-8").lower()
            for command in RAILWAY_DEPLOYMENT_COMMANDS:
                if command in text:
                    violations.append(f"{path.relative_to(REPO_ROOT)}: {command}")
        self.assertEqual(violations, [], "Railway deployment commands found in current targets:\n" + "\n".join(violations))

    def test_current_markdown_links_resolve(self) -> None:
        broken: list[str] = []
        for path in _iter_current_text_files():
            if path.suffix.lower() != ".md":
                continue
            text = path.read_text(encoding="utf-8")
            for match in MARKDOWN_LINK_RE.finditer(text):
                raw_target = match.group(1)
                resolved = _local_markdown_target(path, raw_target)
                if resolved is None:
                    continue
                try:
                    resolved.relative_to(REPO_ROOT)
                except ValueError:
                    broken.append(f"{path.relative_to(REPO_ROOT)}: link escapes repository: {raw_target}")
                    continue
                if not resolved.exists():
                    broken.append(f"{path.relative_to(REPO_ROOT)}: missing link target: {raw_target}")
        self.assertEqual(broken, [], "broken local links found in current Markdown:\n" + "\n".join(broken))


if __name__ == "__main__":
    unittest.main()
