from fastapi import APIRouter, Request

from app.core.config import settings
from app.core.responses import envelope

router = APIRouter(tags=["system"])


@router.get("/health")
def health(request: Request) -> dict:
    return envelope(
        data={"status": "ok", "service": settings.app_name},
        trace_id=request.state.trace_id,
    )
