from __future__ import annotations

from dataclasses import asdict
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, field_validator

from aurea_api.api.auth import AuthenticatedUser, get_authenticated_user
from aurea_api.dependencies import get_astrology_service
from aurea_api.domain.astrology.service import (
    AstrologyService,
    BirthProfileRequiredError,
    CalculationInvalidError,
    CalculationUnavailableError,
    ReceiptNotFoundError,
)
from aurea_api.errors import ApiProblem
from aurea_api.infrastructure.db import CalculationReceiptRecord

router = APIRouter(prefix="/v1/astrology", tags=["astrology"])


class _CalculationOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    force: bool = False


class TransitRequest(_CalculationOptions):
    as_of: datetime

    @field_validator("as_of")
    @classmethod
    def _require_aware_datetime(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("as_of must be timezone-aware")
        return value


class ReceiptResponse(BaseModel):
    id: UUID
    birth_profile_id: UUID
    kind: str
    input_hash: str
    schema_version: str
    input_payload: dict[str, object]
    result_payload: dict[str, object]
    engine_name: str
    engine_version: str
    ephemeris_version: str
    resolved_at: datetime
    resolved_timezone: str
    created_at: datetime

    @classmethod
    def from_record(cls, record: CalculationReceiptRecord) -> ReceiptResponse:
        return cls.model_validate(asdict(record))


def _service_problem(exc: Exception) -> ApiProblem:
    if isinstance(exc, BirthProfileRequiredError):
        return ApiProblem(
            status_code=404,
            code="birth_profile_required",
            message="An active birth profile is required.",
        )
    if isinstance(exc, CalculationInvalidError):
        return ApiProblem(
            status_code=422,
            code="calculation_invalid",
            message="Calculation input is invalid.",
        )
    if isinstance(exc, CalculationUnavailableError):
        return ApiProblem(
            status_code=503,
            code="calculation_unavailable",
            message="The astrology engine is unavailable.",
        )
    if isinstance(exc, ReceiptNotFoundError):
        return ApiProblem(
            status_code=404,
            code="receipt_not_found",
            message="Calculation receipt not found.",
        )
    raise exc


@router.post("/natal", response_model=ReceiptResponse)
async def post_natal(
    user: Annotated[AuthenticatedUser, Depends(get_authenticated_user)],
    service: Annotated[AstrologyService, Depends(get_astrology_service)],
    options: _CalculationOptions | None = None,
) -> ReceiptResponse:
    try:
        receipt = await service.natal(user.subject, force=options.force if options else False)
    except (BirthProfileRequiredError, CalculationInvalidError, CalculationUnavailableError) as exc:
        raise _service_problem(exc) from exc
    return ReceiptResponse.from_record(receipt)


@router.post("/transits", response_model=ReceiptResponse)
async def post_transits(
    request: TransitRequest,
    user: Annotated[AuthenticatedUser, Depends(get_authenticated_user)],
    service: Annotated[AstrologyService, Depends(get_astrology_service)],
) -> ReceiptResponse:
    try:
        receipt = await service.transits(user.subject, request.as_of, force=request.force)
    except (BirthProfileRequiredError, CalculationInvalidError, CalculationUnavailableError) as exc:
        raise _service_problem(exc) from exc
    return ReceiptResponse.from_record(receipt)


@router.get("/receipts/{receipt_id}", response_model=ReceiptResponse)
async def get_receipt(
    receipt_id: UUID,
    user: Annotated[AuthenticatedUser, Depends(get_authenticated_user)],
    service: Annotated[AstrologyService, Depends(get_astrology_service)],
) -> ReceiptResponse:
    try:
        receipt = await service.get_receipt(user.subject, receipt_id)
    except ReceiptNotFoundError as exc:
        raise _service_problem(exc) from exc
    return ReceiptResponse.from_record(receipt)
