from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, field_validator

from ..users.validation import (
    normalize_coordinate,
    normalize_iana_timezone,
    normalize_local_time,
)

Latitude = Annotated[
    Decimal,
    Field(ge=Decimal("-90"), le=Decimal("90"), max_digits=9, decimal_places=6),
    AfterValidator(normalize_coordinate),
]
Longitude = Annotated[
    Decimal,
    Field(ge=Decimal("-180"), le=Decimal("180"), max_digits=9, decimal_places=6),
    AfterValidator(normalize_coordinate),
]
HouseSystem = Literal[
    "Regiomontanus",
    "Placidus",
    "Koch",
    "Porphyrius",
    "Campanus",
    "Morinus",
    "Whole_Sign",
    "Equal",
]


class _AstrologyInput(BaseModel):
    model_config = ConfigDict(extra="forbid")


class BirthInput(_AstrologyInput):
    birth_date: date
    birth_time: time
    timezone: Annotated[str, AfterValidator(normalize_iana_timezone)]
    latitude: Latitude
    longitude: Longitude
    house_system: HouseSystem = "Regiomontanus"
    utc_offset_minutes: int | None = Field(default=None, ge=-840, le=840)

    @field_validator("birth_time")
    @classmethod
    def _normalize_birth_time(cls, value: time) -> time:
        return normalize_local_time(value)


class TransitInput(_AstrologyInput):
    as_of: datetime
    latitude: Latitude | None = None
    longitude: Longitude | None = None
    include_asteroids: bool = False

    @field_validator("as_of")
    @classmethod
    def _require_aware_instant(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("as_of must be timezone-aware")
        return value
