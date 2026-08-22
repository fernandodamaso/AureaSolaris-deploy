from __future__ import annotations

from collections.abc import Mapping
from typing import Any, cast

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

_SAFE_VALIDATION_MESSAGE = "Invalid value."
_TRUSTED_VALIDATION_SOURCES = frozenset({"body", "query", "path", "header", "cookie"})


class ProblemResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    message: str
    request_id: str
    fields: list[dict[str, object]] | None = Field(default=None)


PROBLEM_RESPONSES: dict[int | str, dict[str, Any]] = {
    401: {"model": ProblemResponse, "description": "Authentication required."},
    404: {"model": ProblemResponse, "description": "Resource not found."},
    422: {"model": ProblemResponse, "description": "Request validation failed."},
    503: {"model": ProblemResponse, "description": "Service unavailable."},
}


class ApiProblem(Exception):
    """Expected API failure with a stable, client-safe public contract."""

    def __init__(
        self,
        *,
        status_code: int,
        code: str,
        message: str,
        headers: Mapping[str, str] | None = None,
    ) -> None:
        super().__init__(code)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.headers = dict(headers) if headers is not None else None


def _request_id(request: Request) -> str:
    value = getattr(request.state, "request_id", None)
    return value if isinstance(value, str) else "unavailable"


def _safe_validation_location(location: tuple[str | int, ...]) -> list[str]:
    """Expose only trusted request source plus generic non-sensitive path tokens."""

    if not location:
        return ["request"]

    first = location[0]
    source = first if isinstance(first, str) and first in _TRUSTED_VALIDATION_SOURCES else "request"
    public_location = [source]

    for segment in location[1:]:
        if segment == "[key]":
            if len(public_location) > 1:
                public_location.pop()
            public_location.append("key")
        elif isinstance(segment, int):
            public_location.append("item")
        else:
            public_location.append("field")

    return public_location


def problem_response(
    request: Request,
    *,
    status_code: int,
    code: str,
    message: str,
    fields: list[dict[str, object]] | None = None,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    payload: dict[str, object] = {
        "code": code,
        "message": message,
        "request_id": _request_id(request),
    }
    if fields is not None:
        payload["fields"] = fields
    return JSONResponse(status_code=status_code, content=payload, headers=headers)


async def api_problem_handler(request: Request, exc: Exception) -> JSONResponse:
    problem = cast(ApiProblem, exc)
    return problem_response(
        request,
        status_code=problem.status_code,
        code=problem.code,
        message=problem.message,
        headers=problem.headers,
    )


async def validation_error_handler(request: Request, exc: Exception) -> JSONResponse:
    validation_error = cast(RequestValidationError, exc)
    fields: list[dict[str, object]] = [
        {
            "location": _safe_validation_location(error["loc"]),
            "message": _SAFE_VALIDATION_MESSAGE,
            "type": str(error["type"]),
        }
        for error in validation_error.errors()
    ]
    return problem_response(
        request,
        status_code=422,
        code="validation_error",
        message="Request validation failed.",
        fields=fields,
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ApiProblem, api_problem_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
