"""Report known generated paths without modifying the repository."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


ALLOWED_GENERATED_PATHS = (
    Path("dist"),
    Path("dist-ssr"),
    Path("build"),
    Path("src-tauri") / "target",
    Path("src-tauri") / "errors.txt",
    Path("__pycache__"),
    Path("tests") / "__pycache__",
    Path("tools") / "__pycache__",
    Path("knowledge") / "engenharia_astrologica" / "tools" / "__pycache__",
)

PROTECTED_PATHS = (
    Path("knowledge") / "engenharia_astrologica",
    Path("knowledge") / "engenharia_astrologica" / "docs",
    Path("knowledge") / "engenharia_astrologica" / "knowledge" / "build",
    Path("knowledge")
    / "engenharia_astrologica"
    / "knowledge"
    / "build"
    / "editorial_current.sqlite",
    Path("natal_charts"),
    Path("src-tauri") / "memory",
)


@dataclass(frozen=True)
class CleanupCandidate:
    relative_path: str
    kind: str
    planned_action: str = "report only; no deletion"


def _resolved_relative_path(repository_root: Path, path: Path) -> Path | None:
    root = repository_root.resolve()
    resolved_path = path.resolve()
    try:
        return resolved_path.relative_to(root)
    except ValueError:
        return None


def is_safe_allowlisted_path(repository_root: Path, path: Path) -> bool:
    """Return whether ``path`` stays inside the root and an allowlisted path."""

    relative_path = _resolved_relative_path(repository_root, path)
    if relative_path is None or relative_path == Path("."):
        return False

    return any(
        relative_path == allowed_path or allowed_path in relative_path.parents
        for allowed_path in ALLOWED_GENERATED_PATHS
    )


def discover_candidates(repository_root: Path) -> list[CleanupCandidate]:
    """Find existing allowlisted generated paths without inspecting source data."""

    root = repository_root.resolve()
    if not root.is_dir():
        raise ValueError(f"Repository root is not a directory: {repository_root}")

    candidates: list[CleanupCandidate] = []
    for relative_path in ALLOWED_GENERATED_PATHS:
        candidate_path = root / relative_path
        if not candidate_path.exists() or not is_safe_allowlisted_path(root, candidate_path):
            continue
        kind = "directory" if candidate_path.is_dir() else "file"
        candidates.append(CleanupCandidate(relative_path.as_posix(), kind))
    return candidates


def _format_paths(paths: Iterable[Path]) -> str:
    return "\n".join(f"  - {path.as_posix()}" for path in paths)


def format_report(repository_root: Path, candidates: Iterable[CleanupCandidate]) -> None:
    """Print the dry-run report and its safety boundaries."""

    root = repository_root.resolve()
    candidate_list = list(candidates)
    print("Aurea Solaris generated-path cleanup — DRY-RUN ONLY")
    print(f"Repository root: {root}")
    print("\nAllowlisted generated paths:")
    print(_format_paths(ALLOWED_GENERATED_PATHS))
    print("\nCandidates and planned actions:")
    if candidate_list:
        for candidate in candidate_list:
            print(f"  - {candidate.relative_path} [{candidate.kind}] -> {candidate.planned_action}")
    else:
        print("  - none found")
    print("\nProtected paths (never cleanup candidates):")
    print(_format_paths(PROTECTED_PATHS))
    print("\nSafety: this command has no delete, move, or overwrite mode; it only reports existing paths.")


def main() -> int:
    repository_root = Path(__file__).resolve().parents[1]
    format_report(repository_root, discover_candidates(repository_root))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
