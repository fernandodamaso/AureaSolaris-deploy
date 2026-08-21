from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class PreviewVerificationScriptTests(unittest.TestCase):
    def test_secrets_are_not_copied_into_command_lines(self) -> None:
        script = (ROOT / "scripts" / "verify_preview.sh").read_text(encoding="utf-8")

        self.assertNotIn("cmd.exe /d /s /c", script)
        self.assertNotIn("set AUREA_E2E_PASSWORD=", script)
        self.assertNotIn("set AUREA_E2E_SECOND_JWT=", script)
        self.assertNotIn("set AUREA_VERCEL_API_PROTECTION_BYPASS=", script)
        self.assertNotIn(
            '-H "x-vercel-protection-bypass: $AUREA_VERCEL_API_PROTECTION_BYPASS"',
            script,
        )
        self.assertNotIn('-H "apikey: $SUPABASE_PREVIEW_ANON_KEY"', script)
        self.assertEqual(script.count("-H @-"), 2)
        self.assertIn('"${NPX[@]}" playwright test', script)

    def test_python_launcher_is_executed_before_it_is_selected(self) -> None:
        for script_name in ("verify_preview.sh", "smoke_api.sh"):
            with self.subTest(script=script_name):
                script = (ROOT / "scripts" / script_name).read_text(encoding="utf-8")

                self.assertIn("for candidate in python3 python python.exe; do", script)
                self.assertIn(
                    'command -v "$candidate" >/dev/null 2>&1 '
                    '&& "$candidate" --version >/dev/null 2>&1',
                    script,
                )
                self.assertIn('PYTHON="$candidate"', script)

        verify_script = (ROOT / "scripts" / "verify_preview.sh").read_text(
            encoding="utf-8"
        )
        self.assertIn('signup_error_code="$("$PYTHON" - ', verify_script)


if __name__ == "__main__":
    unittest.main()
