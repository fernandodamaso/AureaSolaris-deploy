import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
IMPORTER = REPO_ROOT / "tools" / "import_engenharia_to_aurea.py"


class EditorialImporterBoundaryTests(unittest.TestCase):
    def test_importer_has_no_retired_runtime_dependency(self) -> None:
        source = IMPORTER.read_text(encoding="utf-8")
        self.assertNotIn("local_storage", source)
        self.assertNotIn("src-tauri", source)


if __name__ == "__main__":
    unittest.main()
