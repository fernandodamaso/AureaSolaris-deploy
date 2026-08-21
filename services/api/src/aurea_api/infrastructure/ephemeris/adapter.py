from __future__ import annotations

from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from aurea_api.domain.astrology import (
    ENGINE_NAME,
    ENGINE_VERSION,
    RECEIPT_SCHEMA_VERSION,
    BirthInput,
    TransitInput,
    calculate_astrology,
    calculate_transit_positions,
    configure_ephemeris,
)
from aurea_api.ephemeris_integrity import (
    CERTIFIED_EPHEMERIS_ASSETS,
)

_CERTIFIED_ASSETS = tuple(CERTIFIED_EPHEMERIS_ASSETS)


class AstrologyEngine:
    """Pure façade over the certified astrology calculation functions."""

    def __init__(self, ephemeris_path: Path | str) -> None:
        self.ephemeris_path = configure_ephemeris(ephemeris_path)

    def is_ready(self) -> bool:
        if not all((self.ephemeris_path / name).is_file() for name in _CERTIFIED_ASSETS):
            return False
        try:
            self.natal(
                BirthInput(
                    birth_date="2000-01-01",
                    birth_time="00:00:00",
                    timezone="UTC",
                    latitude=0,
                    longitude=0,
                )
            )
        except (OSError, RuntimeError, ValueError):
            return False
        return True

    @property
    def metadata(self) -> dict[str, str]:
        return {
            "name": ENGINE_NAME,
            "version": ENGINE_VERSION,
            "receipt_schema_version": RECEIPT_SCHEMA_VERSION,
        }

    def natal(self, birth: BirthInput) -> dict[str, object]:
        return self.calculate_natal(birth)

    def transits(self, birth: BirthInput, as_of: datetime) -> dict[str, object]:
        if as_of.tzinfo is None or as_of.utcoffset() is None:
            raise ValueError("as_of must be timezone-aware")
        local_as_of = as_of.astimezone(ZoneInfo(birth.timezone))
        return self.calculate_transits(
            TransitInput(
                as_of=local_as_of,
                latitude=birth.latitude,
                longitude=birth.longitude,
            )
        )

    def calculate_natal(self, value: BirthInput) -> dict[str, object]:
        result = calculate_astrology(
            year=value.birth_date.year,
            month=value.birth_date.month,
            day=value.birth_date.day,
            hour=value.birth_time.hour
            + value.birth_time.minute / 60
            + value.birth_time.second / 3600,
            lat=float(value.latitude),
            lon=float(value.longitude),
            house_system=value.house_system,
            timezone_name=value.timezone,
            utc_offset_minutes=value.utc_offset_minutes,
        )
        return self._require_certified_result(result)

    def calculate_transits(self, value: TransitInput) -> dict[str, object]:
        timezone_name = getattr(value.as_of.tzinfo, "key", None) or value.as_of.tzname()
        if not timezone_name:
            raise ValueError("as_of must use a named IANA timezone")
        offset = value.as_of.utcoffset()
        if offset is None:
            raise ValueError("as_of must be timezone-aware")
        result = calculate_transit_positions(
            year=value.as_of.year,
            month=value.as_of.month,
            day=value.as_of.day,
            hour=value.as_of.hour
            + value.as_of.minute / 60
            + value.as_of.second / 3600
            + value.as_of.microsecond / 3_600_000_000,
            lat=float(value.latitude) if value.latitude is not None else None,
            lon=float(value.longitude) if value.longitude is not None else None,
            include_asteroids=value.include_asteroids,
            timezone_name=timezone_name,
            utc_offset_minutes=int(offset.total_seconds() // 60),
        )
        return self._require_certified_result(result)

    @staticmethod
    def _require_certified_result(result: dict[str, object]) -> dict[str, object]:
        if result.get("error"):
            raise RuntimeError(str(result["error"]))
        meta = result.get("meta")
        receipt = meta.get("receipt") if isinstance(meta, dict) else None
        ephemeris = receipt.get("ephemeris") if isinstance(receipt, dict) else None
        if not isinstance(ephemeris, dict) or ephemeris.get("library") != "pyswisseph":
            raise RuntimeError("Swiss Ephemeris did not produce a certified result")
        if ephemeris.get("mode") != "swiss":
            raise RuntimeError("Swiss Ephemeris fallback was detected")
        return result


SwissEphemerisAdapter = AstrologyEngine
