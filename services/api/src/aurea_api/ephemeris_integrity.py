from __future__ import annotations

import hashlib
import re
import stat
from pathlib import Path

CERTIFIED_EPHEMERIS_ASSETS: dict[str, tuple[int, str]] = {
    "seas_18.se1": (
        223021,
        "4f4236d96ade96be0d4886fa7e39166cd807c57392b1d283d015f5324e6f1e77",
    ),
    "semo_18.se1": (
        1304788,
        "054f2bb7b52fca894a2bf1f657f3b22b321a2296da16aa1fe87799333f7e38e8",
    ),
    "sepl_18.se1": (
        484078,
        "6753841e68035dac666104f204decb2b66983904a1a719d101609b88f949120d",
    ),
}

_LOCAL_URI = re.compile(r"^[A-Za-z][A-Za-z0-9+.-]*://")
_WRITE_BITS = stat.S_IWUSR | stat.S_IWGRP | stat.S_IWOTH


def validate_packaged_ephemeris(
    value: Path | str,
    *,
    production: bool = False,
    trusted_root: Path | None = None,
) -> Path:
    """Validate the repository-certified Swiss Ephemeris directory."""

    raw = str(value).strip()
    if not raw or _LOCAL_URI.match(raw):
        raise ValueError("ephemeris path must be a local packaged directory")

    candidate = Path(raw).expanduser()
    if candidate.is_symlink():
        raise ValueError("ephemeris directory is not trusted")
    path = candidate.resolve()
    if not path.is_dir():
        raise ValueError("certified ephemeris directory is missing")

    for name, (expected_size, expected_digest) in CERTIFIED_EPHEMERIS_ASSETS.items():
        asset = path / name
        if asset.is_symlink() or not asset.is_file():
            raise ValueError("certified ephemeris assets are incomplete")
        if asset.stat().st_size != expected_size:
            raise ValueError("certified ephemeris asset size is invalid")
        digest = hashlib.sha256(asset.read_bytes()).hexdigest()
        if digest != expected_digest:
            raise ValueError("certified ephemeris asset hash is invalid")

    if production and path != (trusted_root.resolve() if trusted_root else None):
        paths = (path, *(path / name for name in CERTIFIED_EPHEMERIS_ASSETS))
        if any(item.stat().st_mode & _WRITE_BITS for item in paths):
            raise ValueError("ephemeris directory must be packaged and read-only")

    return path
