from typing import Any

from fastapi.responses import JSONResponse


def ok(data: Any = None, meta: dict[str, Any] | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"code": 0, "message": "success", "data": data}
    if meta is not None:
        payload["meta"] = meta
    return payload


def fail(code: int, message: str) -> dict[str, Any]:
    return {"code": code, "message": message, "data": None}


class ApiError(Exception):
    def __init__(self, code: int, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def error_response(error: ApiError) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content=fail(error.code, error.message))
