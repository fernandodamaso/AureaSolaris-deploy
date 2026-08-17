from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from .dependencies import ReadinessProbe, get_database_readiness, get_engine_readiness
from .errors import ApiProblem

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


async def _probe_is_ready(probe: ReadinessProbe) -> bool:
    try:
        return await probe()
    except Exception:
        return False


@router.get("/ready")
async def ready(
    database_probe: Annotated[ReadinessProbe, Depends(get_database_readiness)],
    engine_probe: Annotated[ReadinessProbe, Depends(get_engine_readiness)],
) -> dict[str, str]:
    database_ready = await _probe_is_ready(database_probe)
    engine_ready = await _probe_is_ready(engine_probe)
    if not database_ready or not engine_ready:
        raise ApiProblem(
            status_code=503,
            code="service_not_ready",
            message="Service is not ready.",
        )
    return {"status": "ok"}
