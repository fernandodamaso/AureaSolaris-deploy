from __future__ import annotations

from datetime import date, time
from decimal import Decimal

import pytest
from pydantic import ValidationError

from aurea_api.domain.astrology.engine import ENGINE_NAME, ENGINE_VERSION
from aurea_api.domain.astrology.models import BirthInput, TransitInput


def test_birth_input_normalizes_values_without_inventing_timezone() -> None:
    value = BirthInput(
        birth_date=date(2000, 1, 1),
        birth_time=time(23, 30),
        timezone=" America/Sao_Paulo ",
        latitude=Decimal("-23.5505"),
        longitude=Decimal("-46.6333"),
        house_system="Regiomontanus",
    )

    assert value.timezone == "America/Sao_Paulo"
    assert value.latitude == Decimal("-23.550500")
    assert value.longitude == Decimal("-46.633300")
    assert value.house_system == "Regiomontanus"


def test_transit_input_requires_timezone_aware_instant() -> None:
    with pytest.raises(ValidationError):
        TransitInput(as_of=date(2000, 1, 1))


def test_engine_metadata_is_stable() -> None:
    assert ENGINE_NAME == "aurea-solaris-astro-engine"
    assert ENGINE_VERSION == "2026.08.audit-1"
