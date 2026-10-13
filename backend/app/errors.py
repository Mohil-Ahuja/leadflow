"""Consistent JSON error envelope for every non-2xx response:

    {"error": {"code": "not_found", "message": "Lead 42 not found", "details": null}}
"""

import logging
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("leadflow")


class NotFoundError(Exception):
    def __init__(self, resource: str, resource_id: int):
        self.message = f"{resource} {resource_id} not found"


class FieldError(Exception):
    """A business-rule violation on a single input field (reported as 422)."""

    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message


def _error(status_code: int, code: str, message: str, details: list | None = None) -> JSONResponse:
    body = {"error": {"code": code, "message": message, "details": details}}
    return JSONResponse(status_code=status_code, content=jsonable_encoder(body))


def _code_for(status_code: int) -> str:
    try:
        return HTTPStatus(status_code).phrase.lower().replace(" ", "_")
    except ValueError:
        return "error"


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFoundError)
    async def _not_found(_: Request, exc: NotFoundError) -> JSONResponse:
        return _error(404, "not_found", exc.message)

    @app.exception_handler(FieldError)
    async def _field(_: Request, exc: FieldError) -> JSONResponse:
        details = [{"field": exc.field, "message": exc.message}]
        return _error(422, "validation_error", f"{exc.field}: {exc.message}", details)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        details = [
            {
                "field": ".".join(str(part) for part in err["loc"] if part != "body"),
                "message": err["msg"].removeprefix("Value error, "),
            }
            for err in exc.errors()
        ]
        first = details[0] if details else None
        message = f"{first['field']}: {first['message']}" if first and first["field"] else (
            first["message"] if first else "Invalid request"
        )
        return _error(422, "validation_error", message, details)

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return _error(exc.status_code, _code_for(exc.status_code), str(exc.detail))

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error", exc_info=exc)
        return _error(500, "internal_error", "Something went wrong on our side. Try again.")
