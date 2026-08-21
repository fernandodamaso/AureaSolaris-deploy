from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class PreviewVerificationScriptTests(unittest.TestCase):
    def test_playwright_secrets_are_not_copied_into_a_command_line(self) -> None:
        script = (ROOT / "scripts" / "verify_preview.sh").read_text(encoding="utf-8")

        self.assertNotIn("cmd.exe /d /s /c", script)
        self.assertNotIn("set AUREA_E2E_PASSWORD=", script)
        self.assertNotIn("set AUREA_E2E_SECOND_JWT=", script)
        self.assertNotIn("set AUREA_VERCEL_API_PROTECTION_BYPASS=", script)
        self.assertIn('"${NPX[@]}" playwright test', script)


if __name__ == "__main__":
    unittest.main()
