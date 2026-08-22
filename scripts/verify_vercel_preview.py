#!/usr/bin/env python3
"""Bind a web or API preview URL to one READY Vercel deployment and Git SHA."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from typing import Any
from urllib.parse import urlsplit


PROJECT = "aurea-solaris-api"
PROJECT_PRODUCTION_HOSTS = {
    "aurea-solaris": "aurea-solaris.vercel.app",
    PROJECT: "aurea-solaris-api.vercel.app",
}
FULL_SHA = re.compile(r"[0-9a-fA-F]{40}")


class VerificationError(RuntimeError):
    """A safe, user-facing preview verification failure."""


def _https_url(value: object, *, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise VerificationError(f"{label} is missing a URL.")
    raw = value.strip()
    if "://" not in raw:
        raw = f"https://{raw}"
    parsed = urlsplit(raw)
    if (
        parsed.scheme.lower() != "https"
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.port is not None
        or parsed.path not in ("", "/")
        or parsed.query
        or parsed.fragment
    ):
        raise VerificationError(f"{label} must be one HTTPS deployment URL or alias.")
    return f"https://{parsed.hostname.lower()}"


def _cli_command() -> list[str]:
    requested = os.environ.get("AUREA_VERCEL_CLI", "vercel")
    resolved = shutil.which(requested) if requested == "vercel" else requested
    if not resolved or not Path(resolved).is_file():
        raise VerificationError("The authenticated Vercel CLI is required.")
    if Path(resolved).suffix.lower() == ".py":
        return [sys.executable, resolved]
    return [resolved]


def _run_vercel(command: list[str], arguments: list[str]) -> Any:
    try:
        result = subprocess.run(
            [*command, *arguments],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=60,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as error:
        raise VerificationError("The Vercel CLI did not complete.") from error
    if result.returncode != 0:
        raise VerificationError(
            f"Vercel CLI {arguments[0]} failed with exit code {result.returncode}."
        )
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise VerificationError(
            f"Vercel CLI {arguments[0]} did not return valid JSON."
        ) from error


def _deployment_page(payload: Any) -> tuple[list[dict[str, Any]], str | None]:
    if not isinstance(payload, dict) or not isinstance(payload.get("deployments"), list):
        raise VerificationError("Vercel list did not return a deployment list.")
    pagination = payload.get("pagination", {})
    if pagination is None:
        pagination = {}
    if not isinstance(pagination, dict):
        raise VerificationError("Vercel list returned invalid pagination metadata.")
    next_cursor = pagination.get("next")
    if next_cursor is not None and (
        isinstance(next_cursor, bool)
        or not isinstance(next_cursor, (int, str))
        or not str(next_cursor).strip()
    ):
        raise VerificationError("Vercel list returned an invalid next cursor.")
    deployments = [
        value for value in payload["deployments"] if isinstance(value, dict)
    ]
    return deployments, None if next_cursor is None else str(next_cursor)


def _is_ready(deployment: dict[str, Any]) -> bool:
    states = [deployment.get(name) for name in ("state", "readyState")]
    present = [state for state in states if state is not None]
    return bool(present) and all(state == "READY" for state in present)


def verify(expected_sha: str, supplied_url: str, *, project: str = PROJECT) -> str:
    if project not in PROJECT_PRODUCTION_HOSTS:
        raise VerificationError("Project must be an approved Aurea Vercel project.")
    if not FULL_SHA.fullmatch(expected_sha):
        raise VerificationError("Expected SHA must be exactly 40 hexadecimal characters.")
    expected_sha = expected_sha.lower()
    supplied_url = _https_url(supplied_url, label="Supplied preview URL")
    production_host = PROJECT_PRODUCTION_HOSTS[project]
    if urlsplit(supplied_url).hostname == production_host:
        raise VerificationError("The canonical production host is not a preview.")

    scope = os.environ.get("AUREA_VERCEL_SCOPE", "").strip()
    if not scope:
        raise VerificationError("AUREA_VERCEL_SCOPE is required.")
    cli = _cli_command()
    list_arguments = [
        "list",
        project,
        "--scope",
        scope,
        "--status",
        "READY",
        "--json",
        "--limit",
        "100",
    ]
    deployments: list[dict[str, Any]] = []
    next_cursor: str | None = None
    seen_cursors: set[str] = set()
    while True:
        arguments = list_arguments.copy()
        if next_cursor is not None:
            arguments.extend(["--next", next_cursor])
        page, following_cursor = _deployment_page(_run_vercel(cli, arguments))
        deployments.extend(page)
        if following_cursor is None:
            break
        if following_cursor in seen_cursors:
            raise VerificationError("Vercel list repeated a pagination cursor.")
        seen_cursors.add(following_cursor)
        next_cursor = following_cursor

    matches = []
    for deployment in deployments:
        meta = deployment.get("meta")
        sha = meta.get("githubCommitSha") if isinstance(meta, dict) else None
        ref = meta.get("githubCommitRef") if isinstance(meta, dict) else None
        if (
            deployment.get("name") == project
            and _is_ready(deployment)
            and isinstance(sha, str)
            and sha.lower() == expected_sha
            and ref == "preview"
        ):
            matches.append(deployment)
    if len(matches) != 1:
        raise VerificationError(
            "Expected exactly one READY preview deployment for the supplied SHA."
        )

    matched_url = _https_url(matches[0].get("url"), label="Matched deployment")
    if urlsplit(matched_url).hostname == production_host:
        raise VerificationError("The matched deployment resolved to production.")
    inspected = _run_vercel(
        cli,
        ["inspect", supplied_url, "--json", "--scope", scope],
    )
    if not isinstance(inspected, dict):
        raise VerificationError("Vercel inspect did not return one deployment.")
    if inspected.get("readyState") != "READY" or inspected.get("target") != "preview":
        raise VerificationError("The inspected deployment is not a READY preview.")
    inspected_url = _https_url(inspected.get("url"), label="Inspected deployment")
    if inspected_url != matched_url:
        raise VerificationError("The inspected URL is not the uniquely matched deployment.")
    return matched_url


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Verify one exact-SHA Aurea Vercel preview deployment."
    )
    parser.add_argument(
        "--project",
        choices=tuple(PROJECT_PRODUCTION_HOSTS),
        default=PROJECT,
    )
    parser.add_argument("expected_sha")
    parser.add_argument("preview_url")
    arguments = parser.parse_args()
    try:
        print(
            verify(
                arguments.expected_sha,
                arguments.preview_url,
                project=arguments.project,
            )
        )
    except VerificationError as error:
        print(f"Preview verification failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
