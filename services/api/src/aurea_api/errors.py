from __future__ import annotations

from typing import cast

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ApiProblem(Exception):
    """Expected API failure with a stable, client-safe public contract."""

    def __init__(self, *, status_code: int, code: str, message: str) -> None:
        super().__init__(code)
        self.status_code = status_code
        self.code = code
        self.message = message


def _request_id(request: Request) -> str:
    value = getattr(request.state, "request_id", None)
    return value if isinstance(value, str) else "unavailable"


def problem_response(
    request: Request,
    *,
    status_code: int,
    code: str,
    message: str,
    fields: list[dict[str, object]] | None = None,
) -> JSONResponse:
    payload: dict[str, object] = {
        "code": code,
        "message": message,
        "request_id": _request_id(request),
    }
    if fields is not None:
        payload["fields"] = fields
    return JSONResponse(status_code=status_code, content=payload)


async def api_problem_handler(request: Request, exc: Exception) -> JSONResponse:
    problem = cast(ApiProblem, exc)
    return problem_response(
        request,
        status_code=problem.status_code,
        code=problem.code,
        message=problem.message,
    )


async def validation_error_handler(request: Request, exc: Exception) -> JSONResponse:
    validation_error = cast(RequestValidationError, exc)
    fields: list[dict[str, object]] = [
        {
            "location": list(error["loc"]),
            "message": str(error["msg"]),
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
