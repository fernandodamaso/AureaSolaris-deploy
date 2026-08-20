from __future__ import annotations

import hashlib
import json
from collections.abc import Mapping
from datetime import UTC, date, datetime, time
from importlib.metadata import PackageNotFoundError, version
from typing import Protocol, cast
from uuid import UUID

from aurea_api.domain.users.models import BirthProfileResponse
from aurea_api.infrastructure.db import (
    BirthProfileRepository,
    CalculationReceiptRecord,
    CalculationReceiptWrite,
    ReceiptConflictError,
    ReceiptKind,
    ReceiptRepository,
)

from .engine import ENGINE_NAME, ENGINE_VERSION, RECEIPT_SCHEMA_VERSION, SWE_PLANETS
from .models import BirthInput


class AstrologyServiceError(Exception):
    """Base error for safe application-service failures."""


class BirthProfileRequiredError(AstrologyServiceError):
    """The owner has no active birth profile."""


class CalculationInvalidError(AstrologyServiceError):
    """The requested calculation input or engine result is invalid."""


class CalculationUnavailableError(AstrologyServiceError):
    """The certified calculation engine is unavailable."""


class ReceiptNotFoundError(AstrologyServiceError):
    """The requested receipt is not owned by the caller."""


class AstrologyEngineProtocol(Protocol):
    @property
    def metadata(self) -> Mapping[str, str]: ...

    def natal(self, birth: BirthInput) -> dict[str, object]: ...

    def transits(self, birth: BirthInput, as_of: datetime) -> dict[str, object]: ...


class BirthProfileStore(Protocol):
    async def get_active(self, user_id: UUID) -> BirthProfileResponse | None: ...


class ReceiptStore(Protocol):
    async def get(self, user_id: UUID, receipt_id: UUID) -> CalculationReceiptRecord | None: ...

    async def find_exact(
        self,
        user_id: UUID,
        kind: ReceiptKind,
        input_hash: str,
    ) -> CalculationReceiptRecord | None: ...

    async def store(
        self,
        user_id: UUID,
        receipt: CalculationReceiptWrite,
    ) -> CalculationReceiptRecord: ...


def _ephemeris_version() -> str:
    try:
        return version("pyswisseph")
    except PackageNotFoundError:
        return "pyswisseph-unavailable"


def _json_hash(value: Mapping[str, object]) -> str:
    canonical = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _iso_date(value: date) -> str:
    return value.isoformat()


def _iso_time(value: time) -> str:
    return value.replace(microsecond=0).isoformat()


class AstrologyService:
    """Owner-scoped orchestration for certified calculations and receipts."""

    def __init__(
        self,
        engine: AstrologyEngineProtocol,
        birth_profiles: BirthProfileStore | BirthProfileRepository,
        receipts: ReceiptStore | ReceiptRepository,
    ) -> None:
        self._engine = engine
        self._birth_profiles = birth_profiles
        self._receipts = receipts

    async def natal(self, user_id: UUID, *, force: bool = False) -> CalculationReceiptRecord:
        birth_profile = await self._require_birth_profile(user_id)
        birth = self._birth_input(birth_profile)
        payload = self._canonical_payload(birth_profile, "natal")
        return await self._calculate(
            user_id,
            birth_profile,
            birth,
            "natal",
            payload,
            force=force,
        )

    async def transits(
        self,
        user_id: UUID,
        as_of: datetime,
        *,
        force: bool = False,
    ) -> CalculationReceiptRecord:
        if as_of.tzinfo is None or as_of.utcoffset() is None:
            raise CalculationInvalidError("as_of must be timezone-aware")
        birth_profile = await self._require_birth_profile(user_id)
        birth = self._birth_input(birth_profile)
        normalized_as_of = as_of.astimezone(UTC)
        payload = self._canonical_payload(
            birth_profile,
            "transit",
            as_of_utc=normalized_as_of,
        )
        return await self._calculate(
            user_id,
            birth_profile,
            birth,
            "transit",
            payload,
            as_of=as_of,
            force=force,
        )

    async def get_receipt(self, user_id: UUID, receipt_id: UUID) -> CalculationReceiptRecord:
        receipt = await self._receipts.get(user_id, receipt_id)
        if receipt is None:
            raise ReceiptNotFoundError("Calculation receipt was not found.")
        return receipt

    async def receipt(self, user_id: UUID, receipt_id: UUID) -> CalculationReceiptRecord:
        return await self.get_receipt(user_id, receipt_id)

    async def calculate_natal(
        self, user_id: UUID, *, force: bool = False
    ) -> CalculationReceiptRecord:
        return await self.natal(user_id, force=force)

    async def calculate_transits(
        self,
        user_id: UUID,
        as_of: datetime,
        *,
        force: bool = False,
    ) -> CalculationReceiptRecord:
        return await self.transits(user_id, as_of, force=force)

    async def _require_birth_profile(self, user_id: UUID) -> BirthProfileResponse:
        profile = await self._birth_profiles.get_active(user_id)
        if profile is None:
            raise BirthProfileRequiredError("An active birth profile is required.")
        return profile

    async def _calculate(
        self,
        user_id: UUID,
        birth_profile: BirthProfileResponse,
        birth: BirthInput,
        kind: ReceiptKind,
        input_payload: dict[str, object],
        *,
        as_of: datetime | None = None,
        force: bool,
    ) -> CalculationReceiptRecord:
        input_hash = _json_hash(input_payload)
        if not force:
            cached = await self._receipts.find_exact(user_id, kind, input_hash)
            if cached is not None:
                return cached

        try:
            result = self._engine.natal(birth) if kind == "natal" else self._engine.transits(
                birth,
                cast(datetime, as_of),
            )
        except ValueError as exc:
            raise CalculationInvalidError("Calculation input is invalid.") from exc
        except Exception as exc:
            raise CalculationUnavailableError("The astrology engine is unavailable.") from exc

        receipt = self._certified_receipt(result)
        resolved_at, resolved_timezone = self._resolved_time(
            receipt,
            fallback=as_of.astimezone(UTC) if as_of is not None else self._birth_utc(birth_profile),
            fallback_timezone=birth_profile.timezone,
        )
        engine_metadata = self._engine.metadata
        write = CalculationReceiptWrite(
            birth_profile_id=birth_profile.id,
            kind=kind,
            input_hash=input_hash,
            input_payload=input_payload,
            result_payload=result,
            engine_name=str(engine_metadata.get("name", ENGINE_NAME)),
            engine_version=str(engine_metadata.get("version", ENGINE_VERSION)),
            ephemeris_version=str(
                cast(dict[str, object], receipt["ephemeris"]).get("library_version")
                or _ephemeris_version()
            ),
            resolved_at=resolved_at,
            resolved_timezone=resolved_timezone,
        )
        try:
            return await self._receipts.store(user_id, write)
        except ReceiptConflictError:
            existing = await self._receipts.find_exact(user_id, kind, input_hash)
            if existing is not None:
                return existing
            raise

    @staticmethod
    def _birth_input(profile: BirthProfileResponse) -> BirthInput:
        return BirthInput(
            birth_date=profile.birth_date,
            birth_time=profile.birth_time,
            timezone=profile.timezone,
            latitude=profile.latitude,
            longitude=profile.longitude,
            house_system="Placidus" if profile.house_system == "P" else profile.house_system,
        )

    def _canonical_payload(
        self,
        profile: BirthProfileResponse,
        kind: ReceiptKind,
        *,
        as_of_utc: datetime | None = None,
    ) -> dict[str, object]:
        metadata = self._engine.metadata
        ephemeris_version = str(metadata.get("ephemeris_version", _ephemeris_version()))
        calculation: dict[str, object] = {
            "zodiac": "tropical",
            "ayanamsa": None,
            "house_system": "Placidus" if profile.house_system == "P" else profile.house_system,
            "orb_policy": "minimum-body-orb × aspect-multiplier",
            "points": sorted(SWE_PLANETS),
        }
        if as_of_utc is not None:
            calculation["as_of_utc"] = as_of_utc.isoformat().replace("+00:00", "Z")
            calculation["include_asteroids"] = False
        return {
            "kind": kind,
            "birth": {
                "birth_date": _iso_date(profile.birth_date),
                "birth_time": _iso_time(profile.birth_time),
                "timezone": profile.timezone,
                "latitude": format(profile.latitude, "f"),
                "longitude": format(profile.longitude, "f"),
            },
            "calculation": calculation,
            "engine": {
                "name": str(metadata.get("name", ENGINE_NAME)),
                "version": str(metadata.get("version", ENGINE_VERSION)),
            },
            "ephemeris": {
                "library": "pyswisseph",
                "version": ephemeris_version,
                "mode": "swiss",
            },
        }

    @staticmethod
    def _certified_receipt(result: dict[str, object]) -> dict[str, object]:
        if not isinstance(result, dict) or result.get("error"):
            raise CalculationUnavailableError("The astrology engine returned no certified result.")
        meta = result.get("meta")
        receipt = meta.get("receipt") if isinstance(meta, dict) else None
        if not isinstance(receipt, dict):
            raise CalculationInvalidError("The astrology engine returned an invalid receipt.")
        ephemeris = receipt.get("ephemeris")
        engine = receipt.get("engine")
        if (
            receipt.get("schema_version") != RECEIPT_SCHEMA_VERSION
            or not isinstance(engine, dict)
            or not engine.get("name")
            or not engine.get("version")
            or not isinstance(ephemeris, dict)
            or ephemeris.get("library") != "pyswisseph"
            or ephemeris.get("mode") != "swiss"
            or not ephemeris.get("library_version")
        ):
            raise CalculationUnavailableError("The astrology engine returned uncertified output.")
        return receipt

    @staticmethod
    def _resolved_time(
        receipt: dict[str, object],
        *,
        fallback: datetime,
        fallback_timezone: str,
    ) -> tuple[datetime, str]:
        resolved = receipt.get("resolved_time")
        if isinstance(resolved, dict):
            raw_utc = resolved.get("utc")
            timezone_name = resolved.get("iana_timezone")
            if isinstance(raw_utc, str) and isinstance(timezone_name, str) and timezone_name:
                try:
                    parsed = datetime.fromisoformat(raw_utc.replace("Z", "+00:00"))
                    if parsed.tzinfo is not None and parsed.utcoffset() is not None:
                        return parsed.astimezone(UTC), timezone_name
                except ValueError:
                    pass
        return fallback.astimezone(UTC), fallback_timezone

    @staticmethod
    def _birth_utc(profile: BirthProfileResponse) -> datetime:
        birth = BirthInput(
            birth_date=profile.birth_date,
            birth_time=profile.birth_time,
            timezone=profile.timezone,
            latitude=profile.latitude,
            longitude=profile.longitude,
            house_system="Placidus" if profile.house_system == "P" else profile.house_system,
        )
        from zoneinfo import ZoneInfo

        return datetime.combine(
            birth.birth_date,
            birth.birth_time,
            tzinfo=ZoneInfo(birth.timezone),
        ).astimezone(UTC)


__all__ = [
    "AstrologyService",
    "AstrologyServiceError",
    "BirthProfileRequiredError",
    "CalculationInvalidError",
    "CalculationUnavailableError",
    "ReceiptNotFoundError",
]
