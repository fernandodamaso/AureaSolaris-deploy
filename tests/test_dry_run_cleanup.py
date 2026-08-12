import io
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from tools.dry_run_cleanup import (
    discover_candidates,
    format_report,
    is_safe_allowlisted_path,
)


class DryRunCleanupTests(unittest.TestCase):
    def test_discovers_only_allowlisted_generated_paths(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "dist").mkdir()
            (root / "dist" / "index.html").write_text("generated", encoding="utf-8")
            (root / "src" / "private").mkdir(parents=True)
            (root / "src" / "private" / "diary.sqlite").write_text("private", encoding="utf-8")
            editorial_build = root / "knowledge" / "engenharia_astrologica" / "knowledge" / "build"
            editorial_build.mkdir(parents=True)
            (editorial_build / "editorial_current.sqlite").write_text("editorial", encoding="utf-8")

            candidates = discover_candidates(root)

            self.assertEqual([candidate.relative_path for candidate in candidates], ["dist"])
            self.assertEqual(candidates[0].planned_action, "report only; no deletion")

    def test_rejects_paths_outside_root_or_allowlist(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "dist").mkdir()
            (root / "private").mkdir()

            self.assertTrue(is_safe_allowlisted_path(root, root / "dist"))
            self.assertTrue(is_safe_allowlisted_path(root, root / "dist" / "index.html"))
            self.assertFalse(is_safe_allowlisted_path(root, root / "private"))
            self.assertFalse(is_safe_allowlisted_path(root, root / "dist" / ".." / "private"))
            self.assertFalse(is_safe_allowlisted_path(root, root.parent / "dist"))

    def test_report_is_explicitly_non_destructive_and_protects_editorial_build(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "__pycache__").mkdir()

            output = io.StringIO()
            with redirect_stdout(output):
                format_report(root, discover_candidates(root))

            report = output.getvalue()
            self.assertIn("DRY-RUN ONLY", report)
            self.assertIn("__pycache__", report)
            self.assertIn("no deletion", report)
            self.assertIn("editorial_current.sqlite", report)
            self.assertIn("protected", report.lower())


if __name__ == "__main__":
    unittest.main()
