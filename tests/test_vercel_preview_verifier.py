from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import textwrap
import unittest


ROOT = Path(__file__).resolve().parents[1]
VERIFIER = ROOT / "scripts" / "verify_vercel_preview.py"
EXPECTED_SHA = "1" * 40
OTHER_SHA = "2" * 40
SCOPE = "test-team"
DEPLOYMENT_HOST = "aurea-solaris-api-expected-test-team.vercel.app"
DEPLOYMENT_URL = f"https://{DEPLOYMENT_HOST}"
PRODUCTION_URL = "https://aurea-solaris-api.vercel.app"


class VercelPreviewVerifierTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.temp_path = Path(self.temp_dir.name)
        self.cli_log = self.temp_path / "vercel-calls.jsonl"
        self.fake_vercel = self.temp_path / "fake_vercel.py"
        self.fake_vercel.write_text(
            textwrap.dedent(
                """
                import json
                import os
                from pathlib import Path
                import sys

                log_path = Path(os.environ["AUREA_FAKE_VERCEL_LOG"])
                existing_calls = [
                    json.loads(line)
                    for line in log_path.read_text(encoding="utf-8").splitlines()
                ] if log_path.exists() else []
                log_path.open("a", encoding="utf-8").write(
                    json.dumps(sys.argv[1:]) + "\\n"
                )
                if sys.argv[1:2] == ["list"]:
                    pages = json.loads(os.environ["AUREA_FAKE_VERCEL_LIST_PAGES_JSON"])
                    list_index = sum(call[:1] == ["list"] for call in existing_calls)
                    print(json.dumps(pages[list_index]))
                elif sys.argv[1:2] == ["inspect"]:
                    print(os.environ["AUREA_FAKE_VERCEL_INSPECT_JSON"])
                else:
                    raise SystemExit(2)
                """
            ).lstrip(),
            encoding="utf-8",
        )

    @staticmethod
    def _deployment(
        *,
        sha: str = EXPECTED_SHA,
        host: str = DEPLOYMENT_HOST,
        uid: str = "dpl_expected",
        ref: str = "preview",
    ) -> dict[str, object]:
        return {
            "uid": uid,
            "name": "aurea-solaris-api",
            "url": host,
            "state": "READY",
            "readyState": "READY",
            "meta": {
                "githubCommitSha": sha,
                "githubCommitRef": ref,
            },
        }

    @staticmethod
    def _inspection(
        *,
        host: str = DEPLOYMENT_HOST,
        target: str = "preview",
    ) -> dict[str, object]:
        return {
            "id": "dpl_expected",
            "name": "aurea-solaris-api",
            "url": host,
            "readyState": "READY",
            "target": target,
        }

    @staticmethod
    def _page(
        deployments: list[dict[str, object]],
        *,
        next_cursor: object = None,
        pagination: object | None = None,
    ) -> dict[str, object]:
        return {
            "deployments": deployments,
            "pagination": (
                {"next": next_cursor} if pagination is None else pagination
            ),
        }

    def _run(
        self,
        *arguments: str,
        pages: list[dict[str, object]] | None = None,
        inspection: dict[str, object] | None = None,
    ) -> subprocess.CompletedProcess[str]:
        environment = os.environ.copy()
        environment.update(
            {
                "AUREA_VERCEL_CLI": str(self.fake_vercel),
                "AUREA_VERCEL_SCOPE": SCOPE,
                "AUREA_FAKE_VERCEL_LOG": str(self.cli_log),
                "AUREA_FAKE_VERCEL_LIST_PAGES_JSON": json.dumps(
                    pages if pages is not None else [self._page([self._deployment()])]
                ),
                "AUREA_FAKE_VERCEL_INSPECT_JSON": json.dumps(
                    inspection if inspection is not None else self._inspection()
                ),
            }
        )
        return subprocess.run(
            [sys.executable, str(VERIFIER), *arguments],
            cwd=ROOT,
            env=environment,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=30,
            check=False,
        )

    def _calls(self) -> list[list[str]]:
        if not self.cli_log.exists():
            return []
        return [
            json.loads(line)
            for line in self.cli_log.read_text(encoding="utf-8").splitlines()
        ]

    def test_requires_a_full_commit_sha(self) -> None:
        missing = self._run()
        self.assertNotEqual(missing.returncode, 0)
        self.assertEqual(self._calls(), [])

        invalid = self._run("not-a-full-sha", DEPLOYMENT_URL)
        self.assertNotEqual(invalid.returncode, 0)
        self.assertEqual(self._calls(), [])

    def test_rejects_a_mismatched_sha_from_the_full_ready_list(self) -> None:
        result = self._run(
            EXPECTED_SHA,
            DEPLOYMENT_URL,
            pages=[self._page([self._deployment(sha=OTHER_SHA)])],
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(len(self._calls()), 1)

    def test_rejects_duplicate_matches_without_trusting_metadata_filters(self) -> None:
        result = self._run(
            EXPECTED_SHA,
            DEPLOYMENT_URL,
            pages=[
                self._page([self._deployment()], next_cursor=12345),
                self._page([
                    self._deployment(
                        host="duplicate-test-team.vercel.app",
                        uid="dpl_duplicate",
                    )
                ]),
            ],
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(
            self._calls(),
            [[
                "list",
                "aurea-solaris-api",
                "--scope",
                SCOPE,
                "--status",
                "READY",
                "--json",
                "--limit",
                "100",
            ], [
                "list",
                "aurea-solaris-api",
                "--scope",
                SCOPE,
                "--status",
                "READY",
                "--json",
                "--limit",
                "100",
                "--next",
                "12345",
            ]],
        )

    def test_rejects_an_exact_sha_from_the_wrong_git_ref(self) -> None:
        result = self._run(
            EXPECTED_SHA,
            DEPLOYMENT_URL,
            pages=[self._page([self._deployment(ref="main")])],
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(len(self._calls()), 1)

    def test_rejects_repeated_or_invalid_pagination(self) -> None:
        cases = (
            [
                self._page([], next_cursor="same-cursor"),
                self._page([], next_cursor="same-cursor"),
            ],
            [self._page([self._deployment()], pagination="invalid")],
        )
        expected_list_calls = (2, 1)
        for pages, call_count in zip(cases, expected_list_calls, strict=True):
            with self.subTest(pages=pages):
                self.cli_log.unlink(missing_ok=True)
                result = self._run(EXPECTED_SHA, DEPLOYMENT_URL, pages=pages)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(len(self._calls()), call_count)

    def test_rejects_the_canonical_production_input_before_cli_access(self) -> None:
        result = self._run(EXPECTED_SHA, PRODUCTION_URL)

        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self._calls(), [])

    def test_rejects_inspect_that_resolves_to_production_or_another_deployment(self) -> None:
        cases = (
            self._inspection(host="aurea-solaris-api.vercel.app", target="production"),
            self._inspection(host="another-preview-test-team.vercel.app"),
        )
        for inspection in cases:
            with self.subTest(inspection=inspection):
                self.cli_log.unlink(missing_ok=True)
                result = self._run(
                    EXPECTED_SHA,
                    "https://preview-api-alias-test-team.vercel.app",
                    inspection=inspection,
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(len(self._calls()), 2)

    def test_outputs_only_the_unique_verified_url_for_a_valid_alias(self) -> None:
        result = self._run(
            EXPECTED_SHA,
            "https://preview-api-alias-test-team.vercel.app",
            pages=[self._page([
                self._deployment(sha=OTHER_SHA, host="older-test-team.vercel.app"),
                self._deployment(),
            ])],
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, f"{DEPLOYMENT_URL}\n")
        self.assertEqual(result.stderr, "")
        self.assertEqual(
            self._calls(),
            [
                [
                    "list",
                    "aurea-solaris-api",
                    "--scope",
                    SCOPE,
                    "--status",
                    "READY",
                    "--json",
                    "--limit",
                    "100",
                ],
                [
                    "inspect",
                    "https://preview-api-alias-test-team.vercel.app",
                    "--json",
                    "--scope",
                    SCOPE,
                ],
            ],
        )


if __name__ == "__main__":
    unittest.main()
