from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.permissions import get_current_user
from app.core.responses import envelope
from app.db.deps import get_db_session
from app.repositories import markets as market_repository
from app.repositories import plans as plan_repository
from app.schemas.plans import (
    PlanStatus,
    RouteNodeCreateRequest,
    RouteNodeUpdateRequest,
    TravelPlanCreateRequest,
    TravelPlanUpdateRequest,
)

router = APIRouter(prefix="/api/v1", tags=["travel-plans"])


@router.get("/markets/{market_id}/travel-plans")
def list_market_travel_plans(
    market_id: UUID,
    request: Request,
    status: PlanStatus | None = None,
    region_id: UUID | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    if market_repository.get_market(session, market_id) is None:
        raise HTTPException(status_code=404, detail="Market not found")
    plans = plan_repository.list_market_travel_plans(
        session,
        market_id=market_id,
        current_user_id=current_user["id"],
        can_read_private="user:read" in current_user["permissions"],
        status=status,
        region_id=region_id,
        limit=limit,
        offset=offset,
    )
    return envelope(
        data=plans,
        meta={"limit": limit, "offset": offset},
        trace_id=request.state.trace_id,
    )


@router.post("/markets/{market_id}/travel-plans")
def create_travel_plan(
    market_id: UUID,
    payload: TravelPlanCreateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    if market_repository.get_market(session, market_id) is None:
        raise HTTPException(status_code=404, detail="Market not found")
    try:
        plan = plan_repository.create_travel_plan(
            session,
            market_id=market_id,
            traveler_user_id=current_user["id"],
            country_code=payload.country_code,
            arrival_date=payload.arrival_date,
            arrival_region_id=payload.arrival_region_id,
            needs_pickup=payload.needs_pickup,
            traveler_count=payload.traveler_count,
            budget_min_amount=payload.budget_min_amount,
            budget_max_amount=payload.budget_max_amount,
            budget_currency=payload.budget_currency,
            visibility=payload.visibility,
            title=payload.title,
            notes=payload.notes,
        )
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail="Invalid travel plan reference") from exc
    return envelope(data=plan, trace_id=request.state.trace_id)


@router.get("/travel-plans/{travel_plan_id}")
def get_travel_plan(
    travel_plan_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    plan = _get_visible_plan(session, travel_plan_id, current_user)
    return envelope(data=plan, trace_id=request.state.trace_id)


@router.patch("/travel-plans/{travel_plan_id}")
def update_travel_plan(
    travel_plan_id: UUID,
    payload: TravelPlanUpdateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    plan = _get_existing_plan(session, travel_plan_id)
    _ensure_plan_owner_or_user_write(current_user, plan)
    try:
        updated = plan_repository.update_travel_plan(
            session,
            travel_plan_id,
            country_code=payload.country_code,
            arrival_date=payload.arrival_date,
            arrival_region_id=payload.arrival_region_id,
            needs_pickup=payload.needs_pickup,
            traveler_count=payload.traveler_count,
            budget_min_amount=payload.budget_min_amount,
            budget_max_amount=payload.budget_max_amount,
            budget_currency=payload.budget_currency,
            visibility=payload.visibility,
            title=payload.title,
            notes=payload.notes,
            updated_by=current_user["id"],
        )
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail="Invalid travel plan reference") from exc
    return envelope(data=updated, trace_id=request.state.trace_id)


@router.post("/travel-plans/{travel_plan_id}/publish")
def publish_travel_plan(
    travel_plan_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    plan = _get_existing_plan(session, travel_plan_id)
    _ensure_plan_owner_or_user_write(current_user, plan)
    updated = plan_repository.set_travel_plan_status(
        session,
        travel_plan_id,
        status="active",
        updated_by=current_user["id"],
    )
    session.commit()
    return envelope(data=updated, trace_id=request.state.trace_id)


@router.post("/travel-plans/{travel_plan_id}/archive")
def archive_travel_plan(
    travel_plan_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    plan = _get_existing_plan(session, travel_plan_id)
    _ensure_plan_owner_or_user_write(current_user, plan)
    updated = plan_repository.set_travel_plan_status(
        session,
        travel_plan_id,
        status="archived",
        updated_by=current_user["id"],
    )
    session.commit()
    return envelope(data=updated, trace_id=request.state.trace_id)


@router.get("/travel-plans/{travel_plan_id}/route-nodes")
def list_route_nodes(
    travel_plan_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    _get_visible_plan(session, travel_plan_id, current_user)
    return envelope(
        data=plan_repository.list_route_nodes(session, travel_plan_id),
        trace_id=request.state.trace_id,
    )


@router.post("/travel-plans/{travel_plan_id}/route-nodes")
def create_route_node(
    travel_plan_id: UUID,
    payload: RouteNodeCreateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    plan = _get_existing_plan(session, travel_plan_id)
    _ensure_plan_owner_or_user_write(current_user, plan)
    try:
        node = plan_repository.create_route_node(
            session,
            travel_plan_id=travel_plan_id,
            region_id=payload.region_id,
            sequence=payload.sequence,
            planned_start_at=payload.planned_start_at,
            planned_end_at=payload.planned_end_at,
            notes=payload.notes,
        )
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail="Route node already exists or reference is invalid") from exc
    return envelope(data=node, trace_id=request.state.trace_id)


@router.patch("/travel-plans/{travel_plan_id}/route-nodes/{route_node_id}")
def update_route_node(
    travel_plan_id: UUID,
    route_node_id: UUID,
    payload: RouteNodeUpdateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    plan = _get_existing_plan(session, travel_plan_id)
    _ensure_plan_owner_or_user_write(current_user, plan)
    node = _get_route_node_for_plan(session, travel_plan_id, route_node_id)
    try:
        updated = plan_repository.update_route_node(
            session,
            node["id"],
            region_id=payload.region_id,
            sequence=payload.sequence,
            planned_start_at=payload.planned_start_at,
            planned_end_at=payload.planned_end_at,
            notes=payload.notes,
        )
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail="Route node sequence conflicts or reference is invalid") from exc
    return envelope(data=updated, trace_id=request.state.trace_id)


@router.delete("/travel-plans/{travel_plan_id}/route-nodes/{route_node_id}")
def delete_route_node(
    travel_plan_id: UUID,
    route_node_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    plan = _get_existing_plan(session, travel_plan_id)
    _ensure_plan_owner_or_user_write(current_user, plan)
    _get_route_node_for_plan(session, travel_plan_id, route_node_id)
    deleted = plan_repository.delete_route_node(session, route_node_id)
    session.commit()
    return envelope(data={"deleted": deleted}, trace_id=request.state.trace_id)


def _get_existing_plan(session: Session, travel_plan_id: UUID) -> dict:
    plan = plan_repository.get_travel_plan(session, travel_plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Travel plan not found")
    return plan


def _get_visible_plan(session: Session, travel_plan_id: UUID, current_user: dict) -> dict:
    plan = _get_existing_plan(session, travel_plan_id)
    if plan["visibility"] == "private" and not _can_read_private_plan(current_user, plan):
        raise HTTPException(status_code=404, detail="Travel plan not found")
    return plan


def _can_read_private_plan(current_user: dict, plan: dict) -> bool:
    return current_user["id"] == plan["traveler_user_id"] or "user:read" in current_user["permissions"]


def _ensure_plan_owner_or_user_write(current_user: dict, plan: dict) -> None:
    if current_user["id"] == plan["traveler_user_id"]:
        return
    if "user:write" in current_user["permissions"]:
        return
    raise HTTPException(status_code=403, detail="Permission denied")


def _get_route_node_for_plan(session: Session, travel_plan_id: UUID, route_node_id: UUID) -> dict:
    node = plan_repository.get_route_node(session, route_node_id)
    if node is None or node["travel_plan_id"] != travel_plan_id:
        raise HTTPException(status_code=404, detail="Route node not found")
    return node
