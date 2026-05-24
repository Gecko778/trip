from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.permissions import get_current_user
from app.core.responses import envelope
from app.db.deps import get_db_session
from app.repositories import auth as auth_repository
from app.repositories import communications as communication_repository
from app.repositories import markets as market_repository
from app.repositories import notifications as notification_repository
from app.repositories import orders as order_repository
from app.repositories import plans as plan_repository
from app.schemas.orders import OrderCancelRequest, OrderCreateRequest, ReviewCreateRequest
from app.services import notifications as notification_service

router = APIRouter(prefix="/api/v1", tags=["orders"])


@router.post("/markets/{market_id}/orders")
def create_order(
    market_id: UUID,
    payload: OrderCreateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    _ensure_market_exists(session, market_id)
    traveler_user_id = payload.traveler_user_id or current_user["id"]
    _ensure_order_creator_is_participant(current_user["id"], traveler_user_id, payload.guide_user_id)
    _ensure_users_exist(session, traveler_user_id, payload.guide_user_id)
    if traveler_user_id == payload.guide_user_id:
        raise HTTPException(status_code=400, detail="Traveler and guide must be different users")
    if not order_repository.guide_has_profile(
        session,
        guide_user_id=payload.guide_user_id,
        market_id=market_id,
    ):
        raise HTTPException(status_code=400, detail="Guide profile not found for market")
    if payload.travel_plan_id is not None:
        _ensure_travel_plan_matches(session, payload.travel_plan_id, market_id, traveler_user_id, current_user)
    if payload.message_thread_id is not None:
        _ensure_thread_matches(
            session,
            payload.message_thread_id,
            market_id,
            traveler_user_id,
            payload.guide_user_id,
            current_user["id"],
        )
    try:
        order = order_repository.create_order(
            session,
            market_id=market_id,
            traveler_user_id=traveler_user_id,
            guide_user_id=payload.guide_user_id,
            travel_plan_id=payload.travel_plan_id,
            message_thread_id=payload.message_thread_id,
            guide_price_amount=payload.guide_price_amount,
            guide_price_currency=payload.guide_price_currency,
            service_start_date=payload.service_start_date,
            service_end_date=payload.service_end_date,
            service_region_id=payload.service_region_id,
            needs_pickup=payload.needs_pickup,
            traveler_count=payload.traveler_count,
            itinerary_json=payload.itinerary_json,
            cancellation_policy=payload.cancellation_policy,
            breach_responsibility=payload.breach_responsibility,
            created_by=current_user["id"],
        )
        _notify_other_participant(
            session,
            order=order,
            actor_user_id=current_user["id"],
            title="Order created",
            body="A service order is waiting for confirmation.",
        )
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail="Invalid order reference") from exc
    return envelope(data=order, trace_id=request.state.trace_id)


@router.get("/markets/{market_id}/orders")
def list_my_orders(
    market_id: UUID,
    request: Request,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    _ensure_market_exists(session, market_id)
    orders = order_repository.list_orders(
        session,
        market_id=market_id,
        user_id=current_user["id"],
        limit=limit,
        offset=offset,
    )
    return envelope(data=orders, meta={"limit": limit, "offset": offset}, trace_id=request.state.trace_id)


@router.get("/orders/{order_id}")
def get_order(
    order_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    order = _get_accessible_order(session, order_id, current_user)
    return envelope(data=order, trace_id=request.state.trace_id)


@router.post("/orders/{order_id}/traveler-confirm")
def traveler_confirm_order(
    order_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    order = _get_accessible_order(session, order_id, current_user)
    if current_user["id"] != order["traveler_user_id"]:
        raise HTTPException(status_code=403, detail="Only the traveler can confirm price")
    updated = _confirm_order(session, order, "traveler", current_user["id"])
    return envelope(data=updated, trace_id=request.state.trace_id)


@router.post("/orders/{order_id}/guide-confirm")
def guide_confirm_order(
    order_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    order = _get_accessible_order(session, order_id, current_user)
    if current_user["id"] != order["guide_user_id"]:
        raise HTTPException(status_code=403, detail="Only the guide can confirm itinerary")
    updated = _confirm_order(session, order, "guide", current_user["id"])
    return envelope(data=updated, trace_id=request.state.trace_id)


@router.get("/orders/{order_id}/agreement")
def get_order_agreement(
    order_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    _get_accessible_order(session, order_id, current_user)
    agreement = order_repository.get_agreement_by_order(session, order_id)
    if agreement is None:
        raise HTTPException(status_code=404, detail="Agreement not found")
    return envelope(data=agreement, trace_id=request.state.trace_id)


@router.post("/orders/{order_id}/agreement/sign")
def sign_order_agreement(
    order_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    order = _get_accessible_order(session, order_id, current_user)
    if order["traveler_price_confirmed_at"] is None or order["guide_itinerary_confirmed_at"] is None:
        raise HTTPException(status_code=409, detail="Both sides must confirm the order before signing")
    actor_role = _participant_role(order, current_user["id"])
    agreement = order_repository.get_or_create_agreement(
        session,
        order=order,
        actor_user_id=current_user["id"],
    )
    signed = order_repository.sign_agreement(
        session,
        agreement=agreement,
        actor_role=actor_role,
        actor_user_id=current_user["id"],
    )
    _notify_other_participant(
        session,
        order=order,
        actor_user_id=current_user["id"],
        title="Agreement signed",
        body="The anonymous agreement has been updated.",
        related_agreement_id=signed["id"],
    )
    session.commit()
    return envelope(data=signed, trace_id=request.state.trace_id)


@router.post("/orders/{order_id}/cancel")
def cancel_order(
    order_id: UUID,
    payload: OrderCancelRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    order = _get_accessible_order(session, order_id, current_user)
    cancelled = order_repository.cancel_order(
        session,
        order_id=order_id,
        actor_user_id=current_user["id"],
        reason=payload.reason,
    )
    if cancelled is None:
        raise HTTPException(status_code=409, detail="Order cannot be cancelled")
    _notify_other_participant(
        session,
        order=cancelled,
        actor_user_id=current_user["id"],
        title="Order cancelled",
        body=cancelled["cancellation_penalty_note"],
    )
    session.commit()
    return envelope(data=cancelled, trace_id=request.state.trace_id)


@router.post("/orders/{order_id}/complete")
def complete_order(
    order_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    order = _get_accessible_order(session, order_id, current_user)
    completed = order_repository.complete_order(
        session,
        order_id=order["id"],
        actor_user_id=current_user["id"],
    )
    if completed is None:
        raise HTTPException(status_code=409, detail="Order must be confirmed before completion")
    _notify_other_participant(
        session,
        order=completed,
        actor_user_id=current_user["id"],
        title="Order completed",
        body="The order is complete and can now be reviewed.",
    )
    session.commit()
    return envelope(data=completed, trace_id=request.state.trace_id)


@router.post("/orders/{order_id}/reviews")
def create_order_review(
    order_id: UUID,
    payload: ReviewCreateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    order = _get_accessible_order(session, order_id, current_user)
    if order["status"] != "completed":
        raise HTTPException(status_code=409, detail="Order must be completed before review")
    reviewee_user_id = _other_participant(order, current_user["id"])
    try:
        review = order_repository.create_review(
            session,
            order=order,
            reviewer_user_id=current_user["id"],
            reviewee_user_id=reviewee_user_id,
            rating=payload.rating,
            body=payload.body,
            dimensions_json=payload.dimensions_json,
        )
        _notify_other_participant(
            session,
            order=order,
            actor_user_id=current_user["id"],
            title="New review",
            body="A public review has been posted for the completed order.",
        )
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail="Review already exists or reference is invalid") from exc
    return envelope(data=review, trace_id=request.state.trace_id)


@router.get("/orders/{order_id}/reviews")
def list_order_reviews(
    order_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    _get_accessible_order(session, order_id, current_user)
    return envelope(data=order_repository.list_order_reviews(session, order_id), trace_id=request.state.trace_id)


@router.get("/me/notifications")
def list_my_notifications(
    request: Request,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    notifications = notification_repository.list_notifications(
        session,
        user_id=current_user["id"],
        limit=limit,
        offset=offset,
    )
    return envelope(
        data=notifications,
        meta={"limit": limit, "offset": offset},
        trace_id=request.state.trace_id,
    )


@router.post("/me/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    notification = notification_repository.mark_notification_read(
        session,
        notification_id=notification_id,
        user_id=current_user["id"],
    )
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    session.commit()
    return envelope(data=notification, trace_id=request.state.trace_id)


def _ensure_market_exists(session: Session, market_id: UUID) -> None:
    if market_repository.get_market(session, market_id) is None:
        raise HTTPException(status_code=404, detail="Market not found")


def _ensure_order_creator_is_participant(current_user_id: UUID, traveler_user_id: UUID, guide_user_id: UUID) -> None:
    if current_user_id not in {traveler_user_id, guide_user_id}:
        raise HTTPException(status_code=403, detail="Order creator must be a participant")


def _ensure_users_exist(session: Session, traveler_user_id: UUID, guide_user_id: UUID) -> None:
    if auth_repository.get_user(session, traveler_user_id) is None:
        raise HTTPException(status_code=404, detail="Traveler user not found")
    if auth_repository.get_user(session, guide_user_id) is None:
        raise HTTPException(status_code=404, detail="Guide user not found")


def _ensure_travel_plan_matches(
    session: Session,
    travel_plan_id: UUID,
    market_id: UUID,
    traveler_user_id: UUID,
    current_user: dict,
) -> None:
    plan = plan_repository.get_travel_plan(session, travel_plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Travel plan not found")
    if plan["market_id"] != market_id:
        raise HTTPException(status_code=400, detail="Travel plan belongs to a different market")
    if plan["traveler_user_id"] != traveler_user_id and "user:write" not in current_user["permissions"]:
        raise HTTPException(status_code=403, detail="Travel plan does not belong to traveler")


def _ensure_thread_matches(
    session: Session,
    thread_id: UUID,
    market_id: UUID,
    traveler_user_id: UUID,
    guide_user_id: UUID,
    current_user_id: UUID,
) -> None:
    thread = communication_repository.get_thread(session, thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Message thread not found")
    if thread["market_id"] != market_id:
        raise HTTPException(status_code=400, detail="Message thread belongs to a different market")
    participants = {thread["initiator_user_id"], thread["recipient_user_id"]}
    if participants != {traveler_user_id, guide_user_id}:
        raise HTTPException(status_code=400, detail="Message thread participants do not match order")
    if current_user_id not in participants:
        raise HTTPException(status_code=403, detail="Permission denied")


def _get_accessible_order(session: Session, order_id: UUID, current_user: dict) -> dict:
    order = order_repository.get_order(session, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user["id"] in {order["traveler_user_id"], order["guide_user_id"]}:
        return order
    if "user:read" in current_user["permissions"]:
        return order
    raise HTTPException(status_code=403, detail="Permission denied")


def _confirm_order(session: Session, order: dict, actor_role: str, actor_user_id: UUID) -> dict:
    updated = order_repository.confirm_order(
        session,
        order=order,
        actor_role=actor_role,
        actor_user_id=actor_user_id,
    )
    if updated is None:
        raise HTTPException(status_code=409, detail="Order cannot be confirmed")
    if updated["traveler_price_confirmed_at"] is not None and updated["guide_itinerary_confirmed_at"] is not None:
        order_repository.get_or_create_agreement(
            session,
            order=updated,
            actor_user_id=actor_user_id,
        )
    _notify_other_participant(
        session,
        order=updated,
        actor_user_id=actor_user_id,
        title="Order confirmation updated",
        body="Both sides must confirm before signing the anonymous agreement.",
    )
    session.commit()
    return updated


def _participant_role(order: dict, user_id: UUID) -> str:
    if user_id == order["traveler_user_id"]:
        return "traveler"
    if user_id == order["guide_user_id"]:
        return "guide"
    raise HTTPException(status_code=403, detail="Permission denied")


def _other_participant(order: dict, user_id: UUID) -> UUID:
    if user_id == order["traveler_user_id"]:
        return order["guide_user_id"]
    if user_id == order["guide_user_id"]:
        return order["traveler_user_id"]
    raise HTTPException(status_code=403, detail="Permission denied")


def _notify_other_participant(
    session: Session,
    *,
    order: dict,
    actor_user_id: UUID,
    title: str,
    body: str | None,
    related_agreement_id: UUID | None = None,
) -> None:
    notification_service.notify_user(
        session,
        user_id=_other_participant(order, actor_user_id),
        notification_type="order",
        title=title,
        body=body,
        market_id=order["market_id"],
        related_order_id=order["id"],
        related_thread_id=order["message_thread_id"],
        related_agreement_id=related_agreement_id,
    )
