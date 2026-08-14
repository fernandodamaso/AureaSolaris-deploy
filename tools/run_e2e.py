"""Isolated E2E harness: temp test-user data + local API + Playwright."""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

_seed_path = REPO_ROOT / "tools" / "seed_test_user.py"
_seed_spec = importlib.util.spec_from_file_location("seed_test_user", _seed_path)
_seed = importlib.util.module_from_spec(_seed_spec)
assert _seed_spec.loader is not None
_seed_spec.loader.exec_module(_seed)
is_forbidden_personal_data_dir = _seed.is_forbidden_personal_data_dir
seed_test_user = _seed.seed_test_user

# Re-export for tests
__all__ = [
    "is_forbidden_personal_data_dir",
    "http_get_json",
    "wait_for_test_user_health",
    "pick_free_port",
    "main",
]


def http_get_json(url: str, timeout_s: float = 2.0) -> dict:
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=timeout_s) as response:
        return json.loads(response.read().decode("utf-8"))


def wait_for_test_user_health(base_url: str, timeout_s: float = 30.0) -> dict:
    deadline = time.time() + timeout_s
    last_error = "no response"
    while time.time() < deadline:
        try:
            payload = http_get_json(f"{base_url.rstrip('/')}/health")
            if payload.get("test_user") is not True:
                raise RuntimeError(
                    f"Health at {base_url} is not test_user=true: {payload!r}"
                )
            if int(payload.get("browser_contract_version", -1)) != 2:
                raise RuntimeError(f"Unexpected browser_contract_version: {payload!r}")
            return payload
        except RuntimeError:
            raise
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
            last_error = str(exc)
            time.sleep(0.25)
    raise RuntimeError(f"Timed out waiting for test-user health at {base_url}: {last_error}")


def pick_free_port(host: str = "127.0.0.1") -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind((host, 0))
        return int(sock.getsockname()[1])


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run Aurea E2E against an isolated test-user API.")
    parser.add_argument(
        "--check-forbidden",
        type=Path,
        help="Exit 2 if PATH is the personal Aurea data dir; else exit 0.",
    )
    args = parser.parse_args(argv)
    if args.check_forbidden is not None:
        if is_forbidden_personal_data_dir(args.check_forbidden):
            print(f"REFUSED personal data dir: {args.check_forbidden.resolve()}", file=sys.stderr)
            return 2
        print("ok")
        return 0
    print("Harness body not wired yet; use Task 3.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
