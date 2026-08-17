from __future__ import annotations

from fastapi import FastAPI

from .config import Settings, get_settings
from .dependencies import unavailable_readiness_probe
from .errors import register_error_handlers
from .health import router as health_router
from .middleware import install_http_middleware


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the Web V1 API without opening external connections at import time."""

    resolved_settings = settings if settings is not None else get_settings()
    app = FastAPI(title="Aurea Solaris API", version="0.1.0")
    app.state.settings = resolved_settings
    app.state.database_readiness = unavailable_readiness_probe
    app.state.engine_readiness = unavailable_readiness_probe

    register_error_handlers(app)
    app.include_router(health_router)
    install_http_middleware(app, resolved_settings)
    return app
