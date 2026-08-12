import subprocess
import sys


def test_importing_main_api_preserves_existing_output_streams():
    probe = (
        "import sys; "
        "stdout = sys.stdout; stderr = sys.stderr; "
        "import main_api; "
        "assert sys.stdout is stdout; assert sys.stderr is stderr"
    )
    result = subprocess.run(
        [sys.executable, "-c", probe],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr or result.stdout
