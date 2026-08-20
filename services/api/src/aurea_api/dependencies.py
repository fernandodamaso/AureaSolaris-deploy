from __future__ import annotations

import asyncio
from typing import Protocol, cast

import asyncpg
from fastapi import Request

from aurea_api.domain.astrology.service import AstrologyService
from aurea_api.errors import ApiProblem
from aurea_api.infrastructure.db import (
    BirthProfileRepository,
    ProfileRepository,
    ReceiptRepository,
    create_database_pool,
)
from aurea_api.infrastructure.ephemeris import AstrologyEngine


class ReadinessProbe(Protocol):
    """Async readiness check supplied by an infrastructure adapter."""

    async def __call__(self) -> bool: ...


async def unavailable_readiness_probe() -> bool:
    """Fail closed until a concrete infrastructure probe is injected."""

    return False


def get_database_readiness(request: Request) -> ReadinessProbe:
    return cast(ReadinessProbe, request.app.state.database_readiness)


def get_engine_readiness(request: Request) -> ReadinessProbe:
    return cast(ReadinessProbe, request.app.state.engine_readiness)


async def _get_database_pool(request: Request) -> asyncpg.Pool:
    pool = cast(asyncpg.Pool | None, request.app.state.database_pool)
    if pool is not None:
        return pool

    lock = cast(asyncio.Lock, request.app.state.database_pool_lock)
    async with lock:
        pool = cast(asyncpg.Pool | None, request.app.state.database_pool)
        if pool is None:
            pool = await create_database_pool(request.app.state.settings.database_url)
            request.app.state.database_pool = pool
        return pool


async def get_profile_repository(request: Request) -> ProfileRepository:
    repository = cast(ProfileRepository | None, request.app.state.profile_repository)
    if repository is None:
        repository = ProfileRepository(await _get_database_pool(request))
        request.app.state.profile_repository = repository
    return repository


async def get_birth_profile_repository(request: Request) -> BirthProfileRepository:
    repository = cast(BirthProfileRepository | None, request.app.state.birth_profile_repository)
    if repository is None:
        repository = BirthProfileRepository(await _get_database_pool(request))
        request.app.state.birth_profile_repository = repository
    return repository


async def get_receipt_repository(request: Request) -> ReceiptRepository:
    repository = cast(ReceiptRepository | None, request.app.state.receipt_repository)
    if repository is None:
        repository = ReceiptRepository(await _get_database_pool(request))
        request.app.state.receipt_repository = repository
    return repository


async def get_astrology_service(request: Request) -> AstrologyService:
    service = cast(AstrologyService | None, request.app.state.astrology_service)
    if service is not None:
        return service
    try:
        engine = AstrologyEngine(request.app.state.settings.ephemeris_path)
    except (FileNotFoundError, RuntimeError) as exc:
        raise ApiProblem(
            status_code=503,
            code="calculation_unavailable",
            message="The astrology engine is unavailable.",
        ) from exc
    service = AstrologyService(
        engine,
        await get_birth_profile_repository(request),
        await get_receipt_repository(request),
    )
    request.app.state.astrology_service = service
    return service
