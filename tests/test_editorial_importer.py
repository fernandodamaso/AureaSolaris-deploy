import importlib.util
import sqlite3
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
IMPORTER = REPO_ROOT / "tools" / "import_engenharia_to_aurea.py"


def _load_importer_module():
    spec = importlib.util.spec_from_file_location("fdm734_editorial_importer", IMPORTER)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class EditorialImporterBoundaryTests(unittest.TestCase):
    def test_importer_has_no_retired_runtime_dependency(self) -> None:
        source = IMPORTER.read_text(encoding="utf-8")
        self.assertNotIn("local_storage", source)
        self.assertNotIn("src-tauri", source)

    def test_import_corpus_preserves_impersonal_editorial_database_contract(self) -> None:
        importer = _load_importer_module()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source_root = root / "corpus"
            source_file = source_root / "03_Signos" / "teste.yaml"
            source_file.parent.mkdir(parents=True)
            source_file.write_text(
                """id: signo_teste
nome: Signo Teste
status: complete
descricao: Ficha editorial impessoal para teste de importacao.
""",
                encoding="utf-8",
            )
            output = root / "out" / "editorial.sqlite"

            result = importer.import_corpus(source_root, output)

            self.assertEqual(result["concepts"], 1)
            self.assertGreaterEqual(result["claims"], 1)
            self.assertEqual(result["documents"], 1)
            self.assertEqual(result["files"], 1)
            self.assertTrue(output.is_file())

            with sqlite3.connect(output) as connection:
                self.assertEqual(connection.execute("SELECT COUNT(*) FROM concept").fetchone()[0], 1)
                self.assertGreaterEqual(connection.execute("SELECT COUNT(*) FROM claim").fetchone()[0], 1)
                self.assertEqual(connection.execute("SELECT COUNT(*) FROM source_document").fetchone()[0], 1)
                self.assertEqual(connection.execute("SELECT COUNT(*) FROM import_manifest").fetchone()[0], 1)


if __name__ == "__main__":
    unittest.main()
