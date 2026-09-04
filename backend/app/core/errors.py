"""
app/core/errors.py
~~~~~~~~~~~~~~~~~~
Uniform error envelope for the REST API.

Every error response is normalised to::

    {
      "error": {
        "code": "<stable machine code>",
        "message": "<human readable>",
        "details": <optional structured details | null>
      },
      "detail": "<human readable>"   # kept for backwards compatibility
    }

Register the handlers on the app with :func:`register_error_handlers`.

Ticket: T-06 (consistent errors).
"""
from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


def _envelope(code: str, message: str, details=None) -> dict:
    return {
        "error": {"code": code, "message": message, "details": details},
        "detail": message,
    }


def _code_for_status(status: int) -> str:
    return {
        400: "bad_request",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        409: "conflict",
        413: "payload_too_large",
        422: "validation_error",
        429: "rate_limited",
        500: "internal_error",
        502: "bad_gateway",
        503: "service_unavailable",
    }.get(status, "error")


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, str):
        message, details = detail, None
    else:
        message, details = str(detail), detail
    return JSONResponse(
        status_code=exc.status_code,
        content=_envelope(_code_for_status(exc.status_code), message, details),
        headers=getattr(exc, "headers", None),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=_envelope(
            "validation_error",
            "Request validation failed.",
            jsonable_encoder(exc.errors()),
        ),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content=_envelope("internal_error", "Internal server error.", None),
    )


def register_error_handlers(app: FastAPI) -> None:
    """Attach the uniform error envelope to *app*."""
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
