import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


class CleanGeneratedTests(unittest.TestCase):
  @classmethod
  def setUpClass(cls):
    cls.powershell = shutil.which("powershell")
    cls.script = Path(__file__).resolve().parents[1] / "tools" / "clean-generated.ps1"
    if cls.powershell is None:
      raise unittest.SkipTest("PowerShell is required for clean-generated tests")
    if not cls.script.exists():
      raise unittest.SkipTest("tools/clean-generated.ps1 is missing")

  def _run(self, repo_root: Path, apply: bool = False) -> subprocess.CompletedProcess[str]:
    command = [
      self.powershell,
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      str(self.script),
      "-RepositoryRoot",
      str(repo_root),
    ]
    if apply:
      command.append("-Apply")
    return subprocess.run(command, capture_output=True, text=True, check=False)

  def _seed_fake_repo(self, root: Path) -> None:
    (root / "dist" / "assets").mkdir(parents=True)
    (root / "dist" / "assets" / "app.js").write_text("generated", encoding="utf-8")
    (root / "build" / "cache").mkdir(parents=True)
    (root / "build" / "cache" / "bundle.tmp").write_text("generated", encoding="utf-8")
    (root / "src" / "module" / "__pycache__").mkdir(parents=True)
    (root / "src" / "module" / "__pycache__" / "module.cpython-311.pyc").write_bytes(b"pyc")
    (root / ".pytest_cache").mkdir()
    (root / ".pytest_cache" / "README.md").write_text("cache", encoding="utf-8")

    (root / "knowledge" / "engenharia_astrologica").mkdir(parents=True)
    (root / "knowledge" / "engenharia_astrologica" / "editorial.sqlite").write_text("editorial", encoding="utf-8")
    (root / "natal_charts").mkdir(parents=True)
    (root / "natal_charts" / "sample.db").write_text("natal", encoding="utf-8")
    (root / "data").mkdir(parents=True)
    (root / "data" / "private.vault").write_text("vault", encoding="utf-8")
    (root / "backups").mkdir(parents=True)
    (root / "backups" / "snapshot.stronghold").write_text("stronghold", encoding="utf-8")
    (root / "tests").mkdir(parents=True)
    (root / "tests" / "sentinel.txt").write_text("tests", encoding="utf-8")
    (root / ".aurea-build-venv" / "Scripts").mkdir(parents=True)
    (root / ".aurea-build-venv" / "Scripts" / "python.exe").write_text("venv", encoding="utf-8")
    (root / "src-tauri" / "binaries").mkdir(parents=True)
    (root / "src-tauri" / "binaries" / "astro-engine.exe").write_text("binary", encoding="utf-8")
    (root / "src-tauri" / "memory" / "owners").mkdir(parents=True)
    (root / "src-tauri" / "memory" / "owners" / "owner.json").write_text("{}", encoding="utf-8")
    (root / "protected-root.sqlite").write_text("sqlite", encoding="utf-8")

  def test_dry_run_reports_allowlisted_sentinels_and_deletes_nothing(self):
    with tempfile.TemporaryDirectory() as directory:
      root = Path(directory)
      self._seed_fake_repo(root)

      result = self._run(root, apply=False)
      output = f"{result.stdout}\n{result.stderr}"
      self.assertEqual(result.returncode, 0, output)
      self.assertTrue((root / "dist").exists())
      self.assertTrue((root / "build").exists())
      self.assertTrue((root / "src" / "module" / "__pycache__").exists())
      self.assertIn("PATH=", output)
      self.assertIn("EXISTS=", output)
      self.assertIn("BYTES=", output)
      self.assertIn("ACTION=REPORT", output)
      self.assertNotIn("ACTION=DELETE", output)

  def test_apply_removes_only_allowlisted_sentinels(self):
    with tempfile.TemporaryDirectory() as directory:
      root = Path(directory)
      self._seed_fake_repo(root)

      result = self._run(root, apply=True)
      output = f"{result.stdout}\n{result.stderr}"
      self.assertEqual(result.returncode, 0, output)
      self.assertFalse((root / "dist").exists())
      self.assertFalse((root / "build").exists())
      self.assertFalse((root / "src" / "module" / "__pycache__").exists())
      self.assertFalse((root / ".pytest_cache").exists())
      self.assertIn("ACTION=DELETE", output)

  def test_protected_roots_survive(self):
    with tempfile.TemporaryDirectory() as directory:
      root = Path(directory)
      self._seed_fake_repo(root)

      result = self._run(root, apply=True)
      self.assertEqual(result.returncode, 0, f"{result.stdout}\n{result.stderr}")
      for relative in (
        "knowledge/engenharia_astrologica/editorial.sqlite",
        "natal_charts/sample.db",
        "data/private.vault",
        "backups/snapshot.stronghold",
        "tests/sentinel.txt",
        ".aurea-build-venv/Scripts/python.exe",
        "src-tauri/binaries/astro-engine.exe",
        "src-tauri/memory/owners/owner.json",
      ):
        self.assertTrue((root / relative).exists(), relative)

  def test_protected_extensions_survive(self):
    with tempfile.TemporaryDirectory() as directory:
      root = Path(directory)
      self._seed_fake_repo(root)

      result = self._run(root, apply=True)
      self.assertEqual(result.returncode, 0, f"{result.stdout}\n{result.stderr}")
      self.assertTrue((root / "protected-root.sqlite").exists())

  def test_reparse_point_inside_allowlisted_path_is_refused(self):
    powershell = self.powershell
    with tempfile.TemporaryDirectory() as directory:
      root = Path(directory)
      (root / "dist").mkdir()
      (root / "dist" / "app.js").write_text("generated", encoding="utf-8")
      junction_target = root / "protected-junction-target"
      junction_target.mkdir()
      (junction_target / "secret.txt").write_text("secret", encoding="utf-8")
      junction_path = root / "dist" / "escape-link"
      link_cmd = (
        f"$target = '{junction_target}';"
        f"$link = '{junction_path}';"
        "New-Item -ItemType Junction -Path $link -Target $target | Out-Null"
      )
      subprocess.run(
        [powershell, "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", link_cmd],
        check=True,
      )

      dry_run = self._run(root, apply=False)
      self.assertEqual(dry_run.returncode, 0, f"{dry_run.stdout}\n{dry_run.stderr}")
      self.assertIn("ACTION=REPORT", dry_run.stdout)
      self.assertTrue((root / "dist").exists())

      applied = self._run(root, apply=True)
      self.assertEqual(applied.returncode, 0, f"{applied.stdout}\n{applied.stderr}")
      self.assertTrue((root / "dist").exists())
      self.assertNotIn("ACTION=DELETE", applied.stdout)


if __name__ == "__main__":
  unittest.main()
