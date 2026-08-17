from __future__ import annotations

import json
import logging
import re
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response

from .config import Settings
from .errors import problem_response

REQUEST_ID_HEADER = "X-Request-ID"
_REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")
_REQUEST_LOGGER = logging.getLogger("aurea_api.request")
_REQUEST_LOG_HANDLER_NAME = "aurea_api.request.stderr"
_ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
_ALLOWED_HEADERS = ["Authorization", "Content-Type", REQUEST_ID_HEADER]


def configure_request_logging() -> None:
    """Install the service-owned request logger configuration once per process."""

    _REQUEST_LOGGER.disabled = False
    _REQUEST_LOGGER.setLevel(logging.INFO)
    _REQUEST_LOGGER.propagate = False

    for handler in _REQUEST_LOGGER.handlers:
        if handler.get_name() == _REQUEST_LOG_HANDLER_NAME:
            handler.setLevel(logging.INFO)
            handler.setFormatter(logging.Formatter("%(message)s"))
            return

    handler = logging.StreamHandler()
    handler.set_name(_REQUEST_LOG_HANDLER_NAME)
    handler.setLevel(logging.INFO)
    handler.setFormatter(logging.Formatter("%(message)s"))
    _REQUEST_LOGGER.addHandler(handler)


def _request_id(request: Request) -> str:
    candidate = request.headers.get(REQUEST_ID_HEADER)
    if candidate is not None and _REQUEST_ID_PATTERN.fullmatch(candidate):
        return candidate
    return str(uuid4())


def _route_template(request: Request) -> str:
    route = request.scope.get("route")
    path = getattr(route, "path", None)
    return path if isinstance(path, str) else "<unmatched>"


class SafeApplicationErrorMiddleware(BaseHTTPMiddleware):
    """Sanitize unhandled application errors before CORS decorates the response."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        try:
            return await call_next(request)
        except Exception:
            return problem_response(
                request,
                status_code=500,
                code="internal_error",
                message="Internal server error.",
            )


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Attach request IDs and emit privacy-safe structured request logs."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = _request_id(request)
        request.state.request_id = request_id
        started = perf_counter()
        response = await call_next(request)

        duration_ms = round((perf_counter() - started) * 1000, 3)
        response.headers[REQUEST_ID_HEADER] = request_id
        event = {
            "duration_ms": duration_ms,
            "event": "http_request",
            "method": request.method,
            "request_id": request_id,
            "route": _route_template(request),
            "status": response.status_code,
        }
        _REQUEST_LOGGER.info(json.dumps(event, separators=(",", ":"), sort_keys=True))
        return response


def install_http_middleware(app: FastAPI, settings: Settings) -> None:
    app.add_middleware(SafeApplicationErrorMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_credentials=False,
        allow_methods=_ALLOWED_METHODS,
        allow_headers=_ALLOWED_HEADERS,
        expose_headers=[REQUEST_ID_HEADER],
    )
    app.add_middleware(RequestContextMiddleware)
