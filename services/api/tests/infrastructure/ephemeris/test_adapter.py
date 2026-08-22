from __future__ import annotations

import hashlib
from datetime import date, datetime, time
from decimal import Decimal
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest

from aurea_api.domain.astrology.models import BirthInput
from aurea_api.infrastructure.ephemeris.adapter import AstrologyEngine, SwissEphemerisAdapter

REPOSITORY_ROOT = Path(__file__).resolve().parents[5]
EPHEMERIS_PATH = REPOSITORY_ROOT / "services" / "api" / "ephe"


def _birth_input() -> BirthInput:
    return BirthInput(
        birth_date=date(2000, 1, 1),
        birth_time=time(23, 30),
        timezone="America/Sao_Paulo",
        latitude=Decimal("-23.5505"),
        longitude=Decimal("-46.6333"),
        house_system="Regiomontanus",
    )


def test_adapter_uses_packaged_swiss_ephemeris_and_certified_output() -> None:
    adapter = SwissEphemerisAdapter(EPHEMERIS_PATH)

    assert adapter.is_ready()
    result = adapter.calculate_natal(_birth_input())

    assert result["meta"]["receipt"]["ephemeris"]["library"] == "pyswisseph"
    assert result["meta"]["receipt"]["ephemeris"]["mode"] == "swiss"
    assert result["meta"]["receipt"]["resolved_time"]["utc"] == "2000-01-02T01:30:00Z"


def test_engine_contract_exposes_metadata_and_real_readiness_smoke() -> None:
    engine = AstrologyEngine(EPHEMERIS_PATH)

    assert engine.metadata["name"] == "aurea-solaris-astro-engine"
    assert engine.metadata["version"] == "2026.08.audit-1"
    assert engine.is_ready() is True
    assert engine.natal(_birth_input())["meta"]["receipt"]["ephemeris"]["mode"] == "swiss"
    transit = engine.transits(_birth_input(), datetime(2026, 1, 1, tzinfo=ZoneInfo("UTC")))
    assert transit["meta"]["receipt"]["ephemeris"]["mode"] == "swiss"
    assert SwissEphemerisAdapter is AstrologyEngine


def test_packaged_ephemeris_assets_have_certified_hashes_and_sizes() -> None:
    expected = {
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

    for name, (size, digest) in expected.items():
        path = EPHEMERIS_PATH / name
        assert path.stat().st_size == size
        assert hashlib.sha256(path.read_bytes()).hexdigest() == digest


def test_adapter_rejects_missing_certified_ephemeris_assets(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        SwissEphemerisAdapter(tmp_path)
