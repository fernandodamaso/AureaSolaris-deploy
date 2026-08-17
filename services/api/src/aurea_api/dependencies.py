from __future__ import annotations

from typing import Protocol, cast

from fastapi import Request


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
