from __future__ import annotations

from collections.abc import Callable
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
import subprocess
import tempfile
import textwrap
import threading
import unittest


ROOT = Path(__file__).resolve().parents[1]
GIT_BASH = Path(r"C:\Program Files\Git\bin\bash.exe")
CANONICAL_PRODUCTION_SUPABASE_URL = "https://tgpcpxqqusehssaihvcp.supabase.co"


def _resolve_bash(
    *,
    platform: str = os.name,
    which: Callable[[str], str | None] = shutil.which,
) -> Path | None:
    if platform == "nt" and GIT_BASH.exists():
        return GIT_BASH
    resolved = which("bash")
    return Path(resolved) if resolved else None


BASH = _resolve_bash()


def _bash_path(path: Path) -> str:
    value = path.resolve().as_posix()
    if len(value) >= 3 and value[1:3] == ":/":
        return f"/{value[0].lower()}{value[2:]}"
    return value


def _write_executable(path: Path, content: str) -> None:
    path.write_text(textwrap.dedent(content).lstrip(), encoding="utf-8", newline="\n")
    path.chmod(0o755)


class BashResolutionTests(unittest.TestCase):
    def test_posix_bash_resolution_uses_path_lookup(self) -> None:
        resolver = globals().get("_resolve_bash")
        self.assertIsNotNone(resolver, "portable Bash resolution is required")
        assert resolver is not None
        resolved = resolver(
            platform="posix",
            which=lambda command: "/bin/bash" if command == "bash" else None,
        )

        self.assertEqual(resolved, Path("/bin/bash"))


class PreviewVerificationScriptTests(unittest.TestCase):
    def setUp(self) -> None:
        if BASH is None:
            self.skipTest("bash is required for verifier tests.")

        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.stub_dir = Path(self.temp_dir.name)
        self.arg_log = self.stub_dir / "curl-args.bin"
        self.header_log = self.stub_dir / "curl-headers.txt"
        self.body_log = self.stub_dir / "curl-bodies.txt"
        self.python_log = self.stub_dir / "python-launchers.txt"
        self.npx_log = self.stub_dir / "npx-launch.txt"

        real_python = _bash_path(Path(os.sys.executable))
        _write_executable(
            self.stub_dir / "python3",
            """
            #!/usr/bin/env bash
            printf 'python3\n' >> "$AUREA_TEST_PYTHON_LOG"
            exit 1
            """,
        )
        _write_executable(
            self.stub_dir / "python",
            f"""
            #!/usr/bin/env bash
            printf 'python\n' >> "$AUREA_TEST_PYTHON_LOG"
            exec {real_python!r} "$@"
            """,
        )
        _write_executable(
            self.stub_dir / "python.exe",
            """
            #!/usr/bin/env bash
            printf 'python.exe\n' >> "$AUREA_TEST_PYTHON_LOG"
            exit 1
            """,
        )
        _write_executable(
            self.stub_dir / "npx",
            """
            #!/usr/bin/env bash
            printf 'production_supabase=%s\n' \
              "$AUREA_PRODUCTION_SUPABASE_URL" >> "$AUREA_TEST_NPX_LOG"
            if [[ -n "${AUREA_VERCEL_PROTECTION_BYPASS:-}" ]]; then
              printf 'global_bypass=present\n' >> "$AUREA_TEST_NPX_LOG"
            else
              printf 'global_bypass=absent\n' >> "$AUREA_TEST_NPX_LOG"
            fi
            exit 0
            """,
        )
        _write_executable(
            self.stub_dir / "supabase",
            """
            #!/usr/bin/env bash
            case "$1 $2" in
              'projects list')
                printf '%s\n' '{"projects":[{"ref":"rosklqnnbmhowohoyboj","status":"ACTIVE_HEALTHY"},{"ref":"tgpcpxqqusehssaihvcp","status":"ACTIVE_HEALTHY"}]}'
                ;;
              'migration list')
                printf '%s\n' '{"versions":["202608150001","20260821172829"]}'
                ;;
              'projects api-keys')
                printf '%s\n' '[{"type":"publishable","name":"anon","api_key":"test-publishable-key"}]'
                ;;
              'db query')
                printf '%s\n' '{"rows":[{"tablename":"birth_profiles","rls_enabled":true,"policy_count":1,"policy_names":"birth_profiles_owner_all"},{"tablename":"calculation_receipts","rls_enabled":true,"policy_count":1,"policy_names":"calculation_receipts_owner_all"},{"tablename":"profiles","rls_enabled":true,"policy_count":1,"policy_names":"profiles_owner_all"}]}'
                ;;
              *)
                printf 'unexpected supabase stub call\n' >&2
                exit 2
                ;;
            esac
            """,
        )
        _write_executable(
            self.stub_dir / "curl",
            r"""
            #!/usr/bin/env bash
            set -euo pipefail

            printf '<call>\0' >> "$AUREA_TEST_CURL_ARG_LOG"
            printf '%s\0' "$@" >> "$AUREA_TEST_CURL_ARG_LOG"

            output=''
            url=''
            call_headers=''
            write_status=0
            while (($#)); do
              case "$1" in
                -o)
                  output="$2"
                  shift 2
                  ;;
                -w)
                  write_status=1
                  shift 2
                  ;;
                --max-time|-X|-c|-b)
                  shift 2
                  ;;
                --config)
                  if [[ "$2" != - ]]; then
                    printf 'unexpected curl config source\n' >&2
                    exit 2
                  fi
                  config_value="$(cat)"
                  call_headers+="$config_value"$'\n'
                  printf '%s\n' "$config_value" >> "$AUREA_TEST_CURL_HEADER_LOG"
                  printf '%s\n' "$config_value" | sed 's/\\"/"/g; s/\\\\/\\/g' \
                    >> "$AUREA_TEST_CURL_BODY_LOG"
                  shift 2
                  ;;
                -H)
                  header_source="$2"
                  if [[ "$header_source" == @- ]]; then
                    header_value="$(cat)"
                  elif [[ "$header_source" == @* ]]; then
                    header_file="$(printf '%s' "$header_source" | sed 's/^@//')"
                    header_value="$(cat "$header_file")"
                  else
                    header_value="$header_source"
                  fi
                  call_headers+="$header_value"$'\n'
                  printf '%s\n' "$header_value" >> "$AUREA_TEST_CURL_HEADER_LOG"
                  shift 2
                  ;;
                --data|--data-binary|-d)
                  data_source="$2"
                  if [[ "$data_source" == @- ]]; then
                    cat >> "$AUREA_TEST_CURL_BODY_LOG"
                  else
                    printf '%s\n' "$data_source" >> "$AUREA_TEST_CURL_BODY_LOG"
                  fi
                  shift 2
                  ;;
                http://*|https://*)
                  url="$1"
                  shift
                  ;;
                *)
                  shift
                  ;;
              esac
            done

            status=200
            payload='{}'
            case "$url" in
              */health)
                payload='{"status":"ok"}'
                ;;
              */ready)
                status=503
                payload='{"code":"service_not_ready"}'
                ;;
              */auth/v1/signup)
                status=422
                payload='{"error_code":"signup_disabled"}'
                ;;
              */auth/v1/settings)
                payload='{"external":{"email":true},"disable_signup":true}'
                ;;
              */auth/v1/admin/users*)
                payload='{"users":[{}]}'
                ;;
              */v1/me)
                if [[ "$call_headers" == *'Authorization: Bearer '* ]]; then
                  status=404
                  payload='{"code":"profile_not_found"}'
                else
                  status=401
                  payload='{"code":"missing_bearer_token"}'
                fi
                ;;
              */v1/birth-profile)
                payload='{}'
                ;;
              */v1/astrology/natal)
                payload='{"engine_name":"aurea-solaris-astro-engine","ephemeris_version":"test-version"}'
                ;;
              *)
                printf 'unexpected curl stub URL: %s\n' "$url" >&2
                exit 2
                ;;
            esac

            if [[ -n "$output" ]]; then
              printf '%s' "$payload" > "$output"
            else
              printf '%s' "$payload"
            fi
            if [[ "$write_status" == 1 ]]; then
              printf '%s' "$status"
            fi
            """,
        )

    def _environment(self) -> dict[str, str]:
        env = os.environ.copy()
        env.update(
            {
                "AUREA_TEST_STUB_DIR": _bash_path(self.stub_dir),
                "AUREA_TEST_CURL_ARG_LOG": _bash_path(self.arg_log),
                "AUREA_TEST_CURL_HEADER_LOG": _bash_path(self.header_log),
                "AUREA_TEST_CURL_BODY_LOG": _bash_path(self.body_log),
                "AUREA_TEST_PYTHON_LOG": _bash_path(self.python_log),
                "AUREA_TEST_NPX_LOG": _bash_path(self.npx_log),
                "AUREA_E2E_URL": "https://preview-web.example.test",
                "AUREA_E2E_API_URL": "https://preview-api.example.test",
                "AUREA_E2E_EMAIL": "preview-user@example.test",
                "AUREA_E2E_PASSWORD": "test-preview-password",
                "AUREA_E2E_SECOND_JWT": "test-second-jwt",
                "AUREA_VERCEL_WEB_PROTECTION_BYPASS": "test-web-bypass",
                "AUREA_VERCEL_API_PROTECTION_BYPASS": "test-api-bypass",
                "SUPABASE_PREVIEW_URL": "https://preview-ref.supabase.co",
                "SUPABASE_PREVIEW_ANON_KEY": "test-preview-anon-key",
                "AUREA_PRODUCTION_API_URL": "https://production-api.example.test",
                "AUREA_PRODUCTION_SUPABASE_URL": CANONICAL_PRODUCTION_SUPABASE_URL,
                "AUREA_SMOKE_JWT": "test-smoke-jwt",
                "AUREA_SMOKE_ASTROLOGY": "1",
                "AUREA_VERCEL_PROTECTION_BYPASS": "test-api-bypass",
                "SUPABASE_SERVICE_ROLE_KEY_PREVIEW": "test-preview-service-role",
                "SUPABASE_SERVICE_ROLE_KEY_PRODUCTION": "test-production-service-role",
                "SUPABASE": _bash_path(self.stub_dir / "supabase"),
            }
        )
        env.pop("PYTHON", None)
        return env

    def _run_script(
        self,
        script: str,
        *args: str,
        environment: dict[str, str] | None = None,
    ) -> subprocess.CompletedProcess[str]:
        env = environment or self._environment()
        env["AUREA_TEST_SCRIPT"] = script
        command = (
            'export PATH="$AUREA_TEST_STUB_DIR:/usr/bin:/bin"; '
            'exec bash "$AUREA_TEST_SCRIPT" "$@"'
        )
        return subprocess.run(
            [
                str(BASH),
                "--noprofile",
                "--norc",
                "-c",
                command,
                "aurea-verifier-test",
                *args,
            ],
            cwd=ROOT,
            env=env,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=60,
            check=False,
        )

    def _curl_arguments(self) -> list[str]:
        if not self.arg_log.exists():
            return []
        return [
            value.decode("utf-8")
            for value in self.arg_log.read_bytes().split(b"\0")
            if value
        ]

    def _clear_logs(self) -> None:
        for path in (
            self.arg_log,
            self.header_log,
            self.body_log,
            self.python_log,
            self.npx_log,
        ):
            path.unlink(missing_ok=True)

    def test_smoke_keeps_headers_and_birth_body_out_of_process_arguments(self) -> None:
        result = self._run_script(
            "scripts/smoke_api.sh",
            "https://preview-api.example.test",
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

        arguments = "\n".join(self._curl_arguments())
        for sensitive_value in (
            "test-api-bypass",
            "test-smoke-jwt",
            "1990-01-01",
            "12:00:00",
            '"place":"E2E"',
        ):
            with self.subTest(value=sensitive_value):
                self.assertNotIn(sensitive_value, arguments)

        headers = (
            self.header_log.read_text(encoding="utf-8")
            if self.header_log.exists()
            else ""
        )
        bodies = self.body_log.read_text(encoding="utf-8")
        self.assertIn("test-api-bypass", headers)
        self.assertIn("test-smoke-jwt", headers)
        self.assertIn("1990-01-01", bodies)
        self.assertIn('"place":"E2E"', bodies)

    def test_smoke_secure_streams_work_with_the_real_windows_curl(self) -> None:
        if os.name != "nt":
            self.skipTest("This regression targets native Windows curl.")
        real_curl = shutil.which("curl.exe") or shutil.which("curl")
        if not real_curl:
            self.skipTest("curl is required for the real executable regression.")

        requests: list[tuple[str, str, bytes]] = []

        class Handler(BaseHTTPRequestHandler):
            def _respond(self, status: int, payload: str) -> None:
                length = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(length) if length else b""
                requests.append((self.path, self.headers.get("Authorization", ""), body))
                encoded = payload.encode("utf-8")
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(encoded)))
                self.end_headers()
                self.wfile.write(encoded)

            def do_GET(self) -> None:  # noqa: N802
                if self.path == "/health":
                    self._respond(200, '{"status":"ok"}')
                elif self.path == "/ready":
                    self._respond(503, '{"code":"service_not_ready"}')
                elif self.path == "/v1/me" and self.headers.get("Authorization"):
                    self._respond(404, '{"code":"profile_not_found"}')
                elif self.path == "/v1/me":
                    self._respond(401, '{"code":"missing_bearer_token"}')
                else:
                    self._respond(404, '{"code":"not_found"}')

            def do_PUT(self) -> None:  # noqa: N802
                self._respond(200, "{}")

            def do_POST(self) -> None:  # noqa: N802
                self._respond(
                    200,
                    '{"engine_name":"aurea-solaris-astro-engine",'
                    '"ephemeris_version":"test-version"}',
                )

            def log_message(self, _format: str, *_args: object) -> None:
                return

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(thread.join, 5)
        self.addCleanup(server.shutdown)

        _write_executable(
            self.stub_dir / "curl",
            r"""
            #!/usr/bin/env bash
            printf '<call>\0' >> "$AUREA_TEST_CURL_ARG_LOG"
            printf '%s\0' "$@" >> "$AUREA_TEST_CURL_ARG_LOG"
            exec "$AUREA_TEST_REAL_CURL" "$@"
            """,
        )
        environment = self._environment()
        environment["AUREA_TEST_REAL_CURL"] = _bash_path(Path(real_curl))
        result = self._run_script(
            "scripts/smoke_api.sh",
            f"http://127.0.0.1:{server.server_port}",
            environment=environment,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

        arguments = "\n".join(self._curl_arguments())
        for sensitive_value in (
            "test-api-bypass",
            "test-smoke-jwt",
            "1990-01-01",
            "12:00:00",
            '"place":"E2E"',
        ):
            with self.subTest(value=sensitive_value):
                self.assertNotIn(sensitive_value, arguments)

        self.assertTrue(
            any(auth == "Bearer test-smoke-jwt" for _, auth, _ in requests)
        )
        self.assertTrue(any(b"1990-01-01" in body for _, _, body in requests))
        self.assertTrue(any(b'"place":"E2E"' in body for _, _, body in requests))

    def test_preview_wrapper_requires_production_origin_and_reads_auth_settings(self) -> None:
        missing_environment = self._environment()
        missing_environment.pop("AUREA_PRODUCTION_SUPABASE_URL")
        missing_result = self._run_script(
            "scripts/verify_preview.sh",
            environment=missing_environment,
        )
        self.assertNotEqual(missing_result.returncode, 0)
        self.assertIn("AUREA_PRODUCTION_SUPABASE_URL is required", missing_result.stderr)
        self.assertFalse(self.npx_log.exists(), "missing origin reached browser launch")

        wrong_environment = self._environment()
        wrong_environment["AUREA_PRODUCTION_SUPABASE_URL"] = (
            "https://tgpcpxqqusehssaihvcp.supabase.co.invalid"
        )
        wrong_result = self._run_script(
            "scripts/verify_preview.sh",
            environment=wrong_environment,
        )
        self.assertNotEqual(wrong_result.returncode, 0)
        self.assertIn(CANONICAL_PRODUCTION_SUPABASE_URL, wrong_result.stderr)
        self.assertFalse(self.npx_log.exists(), "fake origin reached browser launch")

        self._clear_logs()
        trailing_slash_environment = self._environment()
        trailing_slash_environment["AUREA_PRODUCTION_SUPABASE_URL"] += "/"
        result = self._run_script(
            "scripts/verify_preview.sh",
            environment=trailing_slash_environment,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("public_signup=disabled", result.stdout)
        self.assertTrue(self.npx_log.exists(), "canonical origin did not reach browser launch")
        self.assertEqual(
            self.npx_log.read_text(encoding="utf-8").splitlines(),
            [
                f"production_supabase={CANONICAL_PRODUCTION_SUPABASE_URL}",
                "global_bypass=absent",
            ],
        )

        arguments = "\n".join(self._curl_arguments())
        self.assertIn("/auth/v1/settings", arguments)
        self.assertNotIn("/auth/v1/signup", arguments)
        self.assertNotIn("--data", arguments)
        self.assertFalse(self.body_log.exists() and self.body_log.read_text(encoding="utf-8"))

    def test_all_verifiers_execute_python_before_selecting_it(self) -> None:
        cases = (
            ("scripts/smoke_api.sh", ("https://preview-api.example.test",)),
            ("scripts/verify_preview.sh", ()),
            ("scripts/verify_supabase_environment.sh", ()),
        )
        for script, args in cases:
            with self.subTest(script=script):
                self._clear_logs()
                result = self._run_script(script, *args)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                launches = self.python_log.read_text(encoding="utf-8").splitlines()
                self.assertIn("python3", launches)
                self.assertIn("python", launches)

        arguments = "\n".join(self._curl_arguments())
        self.assertNotIn("test-publishable-key", arguments)
        self.assertNotIn("test-preview-service-role", arguments)
        self.assertNotIn("test-production-service-role", arguments)
        headers = (
            self.header_log.read_text(encoding="utf-8")
            if self.header_log.exists()
            else ""
        )
        self.assertIn("test-publishable-key", headers)
        self.assertIn("test-preview-service-role", headers)
        self.assertIn("test-production-service-role", headers)

    def test_ownership_spec_guards_the_exact_production_supabase_origin(self) -> None:
        source = (ROOT / "apps/web/e2e/specs/ownership.spec.ts").read_text(
            encoding="utf-8"
        )

        self.assertIn(
            "const canonicalProductionSupabase = "
            f"'{CANONICAL_PRODUCTION_SUPABASE_URL}';",
            source,
        )
        self.assertIn(
            "const configuredProductionSupabase = "
            "process.env.AUREA_PRODUCTION_SUPABASE_URL;",
            source,
        )
        self.assertIn("if (!configuredProductionSupabase) {", source)
        self.assertIn("configuredProductionSupabase.slice(0, -1)", source)
        self.assertIn(
            "if (productionSupabase !== canonicalProductionSupabase) {",
            source,
        )

    def test_api_runbook_uses_only_an_exact_sha_preview_url_for_jwt_smoke(self) -> None:
        source = (ROOT / "docs/operations/VERCEL_API_RUNBOOK.md").read_text(
            encoding="utf-8"
        )

        self.assertNotIn(
            "scripts/smoke_api.sh https://aurea-solaris-api.vercel.app",
            source,
        )
        self.assertEqual(
            source.count('scripts/smoke_api.sh "$AUREA_VERIFIED_PREVIEW_API_URL"'),
            2,
        )
        self.assertIn('githubCommitSha=$AUREA_EXPECTED_PREVIEW_SHA', source)
        self.assertIn('vercel inspect "$AUREA_PREVIEW_API_URL"', source)


if __name__ == "__main__":
    unittest.main()
