from __future__ import annotations

from datetime import UTC, date, datetime, time
from decimal import Decimal
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

import pytest

from aurea_api.domain.astrology.service import (
    AstrologyService,
    BirthProfileRequiredError,
    CalculationUnavailableError,
)
from aurea_api.domain.users.models import BirthProfileResponse
from aurea_api.infrastructure.db import CalculationReceiptRecord, CalculationReceiptWrite

USER_ID = UUID("00000000-0000-0000-0000-000000000001")


def _birth_profile() -> BirthProfileResponse:
    now = datetime(2026, 8, 20, tzinfo=UTC)
    return BirthProfileResponse(
        id=UUID("00000000-0000-0000-0000-000000000010"),
        label="Primary",
        birth_date=date(1990, 1, 1),
        birth_time=time(12, 34, 56),
        timezone="America/Sao_Paulo",
        latitude=Decimal("-15.793889"),
        longitude=Decimal("-47.882778"),
        place="Brasilia",
        house_system="P",
        is_active=True,
        created_at=now,
        updated_at=now,
    )


class MemoryProfiles:
    def __init__(self, profile: BirthProfileResponse | None) -> None:
        self.profile = profile

    async def get_active(self, user_id: UUID) -> BirthProfileResponse | None:
        return self.profile


class MemoryReceipts:
    def __init__(self) -> None:
        self.records: dict[UUID, CalculationReceiptRecord] = {}
        self.by_key: dict[tuple[UUID, str, str], CalculationReceiptRecord] = {}
        self.writes: list[CalculationReceiptWrite] = []

    async def get(self, user_id: UUID, receipt_id: UUID) -> CalculationReceiptRecord | None:
        record = self.records.get(receipt_id)
        return record if record and record.input_payload.get("owner") == str(user_id) else None

    async def find_exact(
        self, user_id: UUID, kind: str, input_hash: str
    ) -> CalculationReceiptRecord | None:
        return self.by_key.get((user_id, kind, input_hash))

    async def store(
        self, user_id: UUID, receipt: CalculationReceiptWrite
    ) -> CalculationReceiptRecord:
        self.writes.append(receipt)
        existing = self.by_key.get((user_id, receipt.kind, receipt.input_hash))
        if existing is not None:
            return existing
        record = CalculationReceiptRecord(
            id=uuid4(),
            birth_profile_id=receipt.birth_profile_id,
            kind=receipt.kind,
            input_hash=receipt.input_hash,
            schema_version=receipt.schema_version,
            input_payload={**receipt.input_payload, "owner": str(user_id)},
            result_payload=receipt.result_payload,
            engine_name=receipt.engine_name,
            engine_version=receipt.engine_version,
            ephemeris_version=receipt.ephemeris_version,
            resolved_at=receipt.resolved_at,
            resolved_timezone=receipt.resolved_timezone,
            created_at=receipt.resolved_at,
        )
        self.records[record.id] = record
        self.by_key[(user_id, receipt.kind, receipt.input_hash)] = record
        return record


class FakeEngine:
    metadata = {
        "name": "test-engine",
        "version": "test-version",
        "ephemeris_version": "test-ephemeris",
    }

    def __init__(self, *, certified: bool = True, fail: bool = False) -> None:
        self.calls = 0
        self.certified = certified
        self.fail = fail

    def natal(self, birth: object) -> dict[str, object]:
        self.calls += 1
        return self._result("natal")

    def transits(self, birth: object, as_of: datetime) -> dict[str, object]:
        self.calls += 1
        return self._result("transit", as_of)

    def _result(self, kind: str, as_of: datetime | None = None) -> dict[str, object]:
        if self.fail:
            raise RuntimeError("engine down")
        if not self.certified:
            return {"meta": {"receipt": {"schema_version": "wrong"}}}
        resolved = as_of.astimezone(UTC) if as_of is not None else datetime(1990, 1, 1, tzinfo=UTC)
        return {
            "planets": {"Sun": {"degree": 1}},
            "meta": {
                "receipt": {
                    "schema_version": "calculation-receipt.v1",
                    "engine": {"name": "test-engine", "version": "test-version"},
                    "ephemeris": {
                        "library": "pyswisseph",
                        "library_version": "test-ephemeris",
                        "mode": "swiss",
                    },
                    "resolved_time": {
                        "utc": resolved.isoformat().replace("+00:00", "Z"),
                        "iana_timezone": "America/Sao_Paulo",
                    },
                }
            },
        }


def _service(
    *, profile: BirthProfileResponse | None = None, engine: FakeEngine | None = None
) -> tuple[AstrologyService, MemoryReceipts, FakeEngine]:
    receipts = MemoryReceipts()
    fake_engine = engine or FakeEngine()
    return (
        AstrologyService(
            engine=fake_engine,
            birth_profiles=MemoryProfiles(profile if profile is not None else _birth_profile()),
            receipts=receipts,
        ),
        receipts,
        fake_engine,
    )


@pytest.mark.asyncio
async def test_missing_birth_profile_is_explicit() -> None:
    service = AstrologyService(
        engine=FakeEngine(),
        birth_profiles=MemoryProfiles(None),
        receipts=MemoryReceipts(),
    )
    with pytest.raises(BirthProfileRequiredError):
        await service.natal(USER_ID)


@pytest.mark.asyncio
async def test_exact_receipt_reuse_and_force_recalculation() -> None:
    service, receipts, engine = _service()

    first = await service.natal(USER_ID)
    cached = await service.natal(USER_ID)
    forced = await service.natal(USER_ID, force=True)

    assert cached == first
    assert forced == first
    assert engine.calls == 2
    assert len(receipts.writes) == 2


@pytest.mark.asyncio
async def test_transit_uses_utc_normalized_hash_and_persists_versions() -> None:
    service, receipts, _ = _service()
    instant = datetime(2026, 8, 20, 15, 0, tzinfo=UTC)

    first = await service.transits(USER_ID, instant)
    cached = await service.transits(USER_ID, instant.astimezone(ZoneInfo("America/Sao_Paulo")))

    assert cached == first
    assert len(receipts.writes) == 1
    write = receipts.writes[0]
    assert write.input_hash == first.input_hash
    assert write.engine_version == "test-version"
    assert write.ephemeris_version == "test-ephemeris"
    assert write.input_payload["calculation"]["as_of_utc"] == "2026-08-20T15:00:00Z"
    assert write.input_payload["calculation"]["zodiac"] == "tropical"
    assert write.input_payload["calculation"]["house_system"] == "Placidus"
    assert write.result_payload["meta"]["receipt"]["input_hash"] == write.input_hash


@pytest.mark.asyncio
async def test_engine_failure_and_uncertified_output_do_not_persist() -> None:
    failing_service, failing_receipts, _ = _service(engine=FakeEngine(fail=True))
    with pytest.raises(CalculationUnavailableError):
        await failing_service.natal(USER_ID)
    assert failing_receipts.writes == []

    uncertified_service, uncertified_receipts, _ = _service(engine=FakeEngine(certified=False))
    with pytest.raises(CalculationUnavailableError):
        await uncertified_service.natal(USER_ID)
    assert uncertified_receipts.writes == []
