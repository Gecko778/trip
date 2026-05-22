from typing import Any
from typing import Optional


def envelope(data: Any, trace_id: str, meta: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "meta": {"trace_id": trace_id, **(meta or {})},
    }


def error_envelope(
    error_code: str,
    message: str,
    trace_id: str,
    field_errors: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    return {
        "success": False,
        "error": {
            "error_code": error_code,
            "message": message,
            "field_errors": field_errors or {},
            "trace_id": trace_id,
        },
    }
