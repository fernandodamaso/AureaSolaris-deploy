"""Isolated private Web V1 E2E harness: Supabase, API, Vite preview, Playwright."""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path
from uuid import uuid4

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

_seed_path = REPO_ROOT / "tools" / "seed_test_user.py"
_seed_spec = importlib.util.spec_from_file_location("seed_test_user", _seed_path)
_seed = importlib.util.module_from_spec(_seed_spec)
assert _seed_spec.loader is not None
_seed_spec.loader.exec_module(_seed)
is_forbidden_personal_data_dir = _seed.is_forbidden_personal_data_dir


def http_get_json(url: str, timeout_s: float = 2.0) -> dict:
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=timeout_s) as response:
        return json.loads(response.read().decode("utf-8"))


def wait_for_test_user_health(base_url: str, timeout_s: float = 30.0) -> dict:
    """Legacy local-owner health guard kept for old diagnostics."""
    deadline = time.time() + timeout_s
    last_error = "no response"
    while time.time() < deadline:
        try:
            payload = http_get_json(f"{base_url.rstrip('/')}/health")
            if payload.get("test_user") is not True:
                raise RuntimeError(f"Health at {base_url} is not test_user=true: {payload!r}")
            if int(payload.get("browser_contract_version", -1)) != 2:
                raise RuntimeError(f"Unexpected browser_contract_version: {payload!r}")
            return payload
        except RuntimeError:
            raise
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
            last_error = str(exc)
            time.sleep(0.25)
    raise RuntimeError(f"Timed out waiting for test-user health at {base_url}: {last_error}")


def wait_for_api_health(base_url: str, timeout_s: float = 45.0) -> dict:
    deadline = time.time() + timeout_s
    last_error = "no response"
    while time.time() < deadline:
        try:
            payload = http_get_json(f"{base_url.rstrip('/')}/health")
            if payload.get("status") != "ok":
                raise RuntimeError(f"API health is not ok: {payload!r}")
            return payload
        except RuntimeError:
            raise
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
            last_error = str(exc)
            time.sleep(0.25)
    raise RuntimeError(f"Timed out waiting for API health at {base_url}: {last_error}")


def pick_free_port(host: str = "127.0.0.1") -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind((host, 0))
        return int(sock.getsockname()[1])


def resolve_node_command(command: str, platform_name: str | None = None) -> str:
    platform_name = platform_name or os.name
    candidate = f"{command}.cmd" if platform_name == "nt" else command
    resolved = shutil.which(candidate)
    if resolved is None:
        raise RuntimeError(f"Required command not found on PATH: {candidate}")
    return resolved


def has_unhandled_api_exception(output: str) -> bool:
    return "ERROR:    Exception in ASGI application" in output


def _redact_output(output: str) -> str:
    lines = []
    for line in output.splitlines():
        if re.search(r"(?:KEY|SECRET|TOKEN|PASSWORD|JWT)\s*=", line, flags=re.IGNORECASE):
            lines.append("[redacted provider output]")
        else:
            lines.append(line)
    return "\n".join(lines)


def _run(command: list[str], *, cwd: Path, env: dict[str, str] | None = None, label: str) -> str:
    completed = subprocess.run(
        command,
        cwd=cwd,
        env=env,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    if completed.returncode != 0:
        raise RuntimeError(f"{label} failed ({completed.returncode}): {_redact_output(completed.stdout)}")
    return completed.stdout


def ensure_frontend_built(env: dict[str, str] | None = None, *, mode: str | None = None) -> None:
    npm = resolve_node_command("npm")
    command = [npm, "run", "build"] if mode is None else [npm, "--workspace", "@aurea/web", "run", "build", "--", "--mode", mode]
    subprocess.run(command, cwd=REPO_ROOT, env=env, check=True)


def ensure_frontend_ready(*, skip_build: bool, env: dict[str, str] | None = None, mode: str | None = None) -> None:
    if not skip_build:
        if env is None and mode is None:
            ensure_frontend_built()
        else:
            ensure_frontend_built(env, mode=mode)
        return
    dist_index = REPO_ROOT / "apps" / "web" / "dist" / "index.html"
    if not dist_index.is_file():
        raise RuntimeError("--skip-build requires an existing apps/web/dist/index.html.")


def _supabase_command(project: Path, *args: str) -> list[str]:
    return [resolve_node_command("npx"), "--yes", "supabase", "--workdir", str(project), *args]


def _make_supabase_project(root: Path) -> Path:
    project = root
    supabase_dir = project / "supabase"
    (supabase_dir / "migrations").mkdir(parents=True, exist_ok=True)
    shutil.copy2(REPO_ROOT / "supabase" / "config.toml", supabase_dir / "config.toml")
    shutil.copy2(
        REPO_ROOT / "supabase" / "migrations" / "202608150001_web_v1_core.sql",
        supabase_dir / "migrations" / "202608150001_web_v1_core.sql",
    )
    config = (supabase_dir / "config.toml").read_text(encoding="utf-8")
    config = config.replace("aurea-solaris-web-v1", f"aurea-e2e-{uuid4().hex[:10]}")
    (supabase_dir / "config.toml").write_text(config, encoding="utf-8")
    return project


def _supabase_env(project: Path) -> dict[str, str]:
    raw = _run(_supabase_command(project, "status", "-o", "env"), cwd=REPO_ROOT, label="supabase status")
    values: dict[str, str] = {}
    for line in raw.splitlines():
        if "=" not in line:
            continue
        name, value = line.split("=", 1)
        values[name.strip()] = value.strip().strip("'\"")
    required = ("API_URL", "ANON_KEY", "SERVICE_ROLE_KEY", "DB_URL")
    missing = [name for name in required if not values.get(name)]
    if missing:
        raise RuntimeError(f"Supabase status did not provide required disposable values: {', '.join(missing)}")
    return values


def _create_test_identity(supabase: dict[str, str]) -> tuple[str, str]:
    email = f"aurea.e2e.{uuid4().hex[:12]}@example.test"
    password = f"E2e-{uuid4().hex}-Aa1!"
    body = json.dumps({"email": email, "password": password, "email_confirm": True}).encode("utf-8")
    request = urllib.request.Request(
        f"{supabase['API_URL'].rstrip('/')}/auth/v1/admin/users",
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "apikey": supabase["SERVICE_ROLE_KEY"],
            "Authorization": f"Bearer {supabase['SERVICE_ROLE_KEY']}",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            if response.status not in (200, 201):
                raise RuntimeError(f"Supabase test identity creation failed with HTTP {response.status}.")
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Supabase test identity creation failed with HTTP {exc.code}.") from None
    return email, password


def run_playwright(base_url: str, api_url: str, email: str, password: str) -> int:
    env = os.environ.copy()
    env.update({
        "AUREA_E2E_URL": base_url,
        "AUREA_E2E_API_URL": api_url,
        "AUREA_E2E_EMAIL": email,
        "AUREA_E2E_PASSWORD": password,
    })
    completed = subprocess.run(
        [
            resolve_node_command("npx"),
            "playwright",
            "test",
            "--config=apps/web/e2e/playwright.config.ts",
            "specs/boot.spec.ts",
            "specs/astrologia.spec.ts",
            "specs/a_profile.spec.ts",
            "specs/degraded-service.spec.ts",
        ],
        cwd=REPO_ROOT,
        env=env,
    )
    return int(completed.returncode)


def _terminate(process: subprocess.Popen | None) -> None:
    if process is None:
        return
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run private Web V1 E2E against disposable local infrastructure.")
    parser.add_argument("--check-forbidden", type=Path)
    parser.add_argument("--keep-temp", action="store_true", help="Do not delete temporary E2E files.")
    parser.add_argument("--skip-build", action="store_true", help="Reuse an existing configured frontend build.")
    args = parser.parse_args(argv)

    if args.check_forbidden is not None:
        if is_forbidden_personal_data_dir(args.check_forbidden):
            print(f"REFUSED personal data dir: {args.check_forbidden.resolve()}", file=sys.stderr)
            return 2
        print("ok")
        return 0

    temp_root = Path(tempfile.mkdtemp(prefix="aurea-e2e-"))
    data_dir = temp_root / "data"
    if is_forbidden_personal_data_dir(data_dir):
        raise RuntimeError(f"Refused forbidden personal data directory: {data_dir.resolve()}")

    api_process: subprocess.Popen | None = None
    frontend_process: subprocess.Popen | None = None
    api_log = None
    frontend_log = None
    playwright_code: int | None = None
    api_unhandled = False
    supabase_started = False
    supabase_project = _make_supabase_project(temp_root)
    try:
        _run(_supabase_command(supabase_project, "start"), cwd=REPO_ROOT, label="supabase start")
        supabase_started = True
        _run(_supabase_command(supabase_project, "db", "reset"), cwd=REPO_ROOT, label="supabase db reset")
        supabase = _supabase_env(supabase_project)
        email, password = _create_test_identity(supabase)

        api_port = pick_free_port()
        frontend_port = pick_free_port()
        api_url = f"http://127.0.0.1:{api_port}"
        frontend_url = f"http://127.0.0.1:{frontend_port}"
        build_env = os.environ.copy()
        build_env.update({
            "VITE_SUPABASE_URL": supabase["API_URL"],
            "VITE_SUPABASE_ANON_KEY": supabase["ANON_KEY"],
            "VITE_AUREA_API_URL": api_url,
        })
        ensure_frontend_ready(skip_build=args.skip_build, env=build_env, mode="test")

        api_env = os.environ.copy()
        api_env.update({
            "AUREA_ENVIRONMENT": "test",
            "AUREA_SUPABASE_URL": supabase["API_URL"],
            "AUREA_JWT_AUDIENCE": "authenticated",
            "AUREA_DATABASE_URL": supabase["DB_URL"],
            "AUREA_ALLOWED_ORIGINS": frontend_url,
            "AUREA_EPHEMERIS_PATH": str(REPO_ROOT / "services" / "api" / "ephe"),
            "ASTRO_API_PORT": str(api_port),
        })
        api_log = (temp_root / "api.log").open("w+", encoding="utf-8")
        api_process = subprocess.Popen(
            [sys.executable, str(REPO_ROOT / "tools" / "e2e_api.py")],
            cwd=REPO_ROOT,
            env=api_env,
            stdout=api_log,
            stderr=subprocess.STDOUT,
        )
        wait_for_api_health(api_url)

        frontend_log = (temp_root / "frontend.log").open("w+", encoding="utf-8")
        frontend_process = subprocess.Popen(
            [resolve_node_command("npm"), "--workspace", "@aurea/web", "run", "preview", "--", "--host", "127.0.0.1", "--port", str(frontend_port)],
            cwd=REPO_ROOT,
            env=build_env,
            stdout=frontend_log,
            stderr=subprocess.STDOUT,
        )
        deadline = time.time() + 30
        while time.time() < deadline:
            try:
                with urllib.request.urlopen(frontend_url, timeout=2):
                    break
            except (urllib.error.URLError, TimeoutError, OSError):
                time.sleep(0.25)
        else:
            raise RuntimeError("Timed out waiting for the Vite preview server.")

        playwright_code = run_playwright(frontend_url, api_url, email, password)
    finally:
        _terminate(frontend_process)
        _terminate(api_process)
        if api_log is not None:
            api_log.flush()
            api_log.seek(0)
            api_output = api_log.read()
            api_log.close()
            api_unhandled = has_unhandled_api_exception(api_output)
            if api_unhandled:
                print("E2E API emitted an unhandled exception.", file=sys.stderr)
        if frontend_log is not None:
            frontend_log.close()
        if supabase_started:
            try:
                _run(_supabase_command(supabase_project, "stop"), cwd=REPO_ROOT, label="supabase stop")
            except RuntimeError:
                print("Disposable Supabase cleanup reported an error.", file=sys.stderr)
        if not args.keep_temp:
            shutil.rmtree(temp_root, ignore_errors=True)

    if playwright_code is None:
        return 1
    if api_unhandled:
        return 1
    return playwright_code


if __name__ == "__main__":
    raise SystemExit(main())
