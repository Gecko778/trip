from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core.permissions import get_current_user
from app.core.responses import envelope
from app.db.deps import get_db_session
from app.repositories import markets as market_repository
from app.repositories import role_visibility as visibility_repository
from app.schemas.role_visibility import ActiveRole, RouteStatusFilter

router = APIRouter(prefix="/api/v1", tags=["role-visibility"])


@router.get("/markets/{market_id}/map-routes")
def list_role_map_routes(
    market_id: UUID,
    role: ActiveRole,
    request: Request,
    status: RouteStatusFilter | None = None,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    _ensure_market_exists(session, market_id)
    routes = visibility_repository.list_map_routes(
        session,
        market_id=market_id,
        user_id=current_user["id"],
        role=role,
        status=status,
    )
    return envelope(data=routes, trace_id=request.state.trace_id)


@router.get("/markets/{market_id}/calendar-events")
def list_role_calendar_events(
    market_id: UUID,
    role: ActiveRole,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    _ensure_market_exists(session, market_id)
    events = visibility_repository.list_calendar_events(
        session,
        market_id=market_id,
        user_id=current_user["id"],
        role=role,
    )
    return envelope(data=events, trace_id=request.state.trace_id)


@router.get("/markets/{market_id}/travel-plan-leads")
def list_travel_plan_leads(
    market_id: UUID,
    request: Request,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    _ensure_market_exists(session, market_id)
    if not any(role["code"] == "guide" for role in current_user["roles"]):
        raise HTTPException(status_code=403, detail="Guide role required")
    leads = visibility_repository.list_travel_plan_leads_for_guide(
        session,
        market_id=market_id,
        guide_user_id=current_user["id"],
        limit=limit,
        offset=offset,
    )
    return envelope(data=leads, meta={"limit": limit, "offset": offset}, trace_id=request.state.trace_id)


@router.get("/markets/{market_id}/partner-leads")
def list_partner_leads(
    market_id: UUID,
    request: Request,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    _ensure_market_exists(session, market_id)
    if not any(role["code"] == "traveler" for role in current_user["roles"]):
        raise HTTPException(status_code=403, detail="Traveler role required")
    leads = visibility_repository.list_partner_leads_for_traveler(
        session,
        market_id=market_id,
        traveler_user_id=current_user["id"],
        limit=limit,
        offset=offset,
    )
    return envelope(data=leads, meta={"limit": limit, "offset": offset}, trace_id=request.state.trace_id)


def _ensure_market_exists(session: Session, market_id: UUID) -> None:
    if market_repository.get_market(session, market_id) is None:
        raise HTTPException(status_code=404, detail="Market not found")
