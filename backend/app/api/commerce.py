from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.permissions import get_current_user
from app.core.responses import envelope
from app.db.deps import get_db_session
from app.repositories import commerce as commerce_repository
from app.repositories import markets as market_repository
from app.repositories import orders as order_repository
from app.schemas.commerce import (
    DisputeCreateRequest,
    FixedFeeCommissionPolicyCreateRequest,
    MembershipPlanCreateRequest,
    MembershipSubscriptionCreateRequest,
    PaymentPlaceholderCreateRequest,
    PayoutAccountCreateRequest,
    PercentageCommissionPolicyCreateRequest,
)
from app.services.commission import preview_commission

router = APIRouter(prefix="/api/v1", tags=["commerce"])


@router.post("/markets/{market_id}/commission-policies/percentage")
def create_percentage_commission_policy(
    market_id: UUID,
    payload: PercentageCommissionPolicyCreateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    _ensure_market_exists(session, market_id)
    _ensure_admin(current_user)
    policy = commerce_repository.create_commission_policy(
        session,
        market_id=market_id,
        service_type=payload.service_type,
        commission_type="percentage",
        commission_rate=payload.commission_rate,
        fixed_service_fee_amount=None,
        currency_code=payload.currency_code,
        min_fee_amount=payload.min_fee_amount,
        max_fee_amount=payload.max_fee_amount,
        status=payload.status,
        effective_at=payload.effective_at,
        expires_at=payload.expires_at,
        created_by=current_user["id"],
    )
    session.commit()
    return envelope(data=policy, trace_id=request.state.trace_id)


@router.post("/markets/{market_id}/commission-policies/fixed-fee")
def create_fixed_fee_commission_policy(
    market_id: UUID,
    payload: FixedFeeCommissionPolicyCreateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    _ensure_market_exists(session, market_id)
    _ensure_admin(current_user)
    policy = commerce_repository.create_commission_policy(
        session,
        market_id=market_id,
        service_type=payload.service_type,
        commission_type="fixed_fee",
        commission_rate=None,
        fixed_service_fee_amount=payload.fixed_service_fee_amount,
        currency_code=payload.currency_code,
        min_fee_amount=None,
        max_fee_amount=None,
        status=payload.status,
        effective_at=payload.effective_at,
        expires_at=payload.expires_at,
        created_by=current_user["id"],
    )
    session.commit()
    return envelope(data=policy, trace_id=request.state.trace_id)


@router.get("/markets/{market_id}/commission-policies")
def list_commission_policies(
    market_id: UUID,
    request: Request,
    service_type: str | None = None,
    status: str | None = None,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    _ensure_market_exists(session, market_id)
    _ensure_admin_or_support(current_user)
    policies = commerce_repository.list_commission_policies(
        session,
        market_id=market_id,
        service_type=service_type,
        status=status,
    )
    return envelope(data=policies, trace_id=request.state.trace_id)


@router.get("/orders/{order_id}/commission-preview")
def preview_order_commission(
    order_id: UUID,
    request: Request,
    service_type: str = "guide_service",
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    order = _get_order_for_user_or_admin_support(session, order_id, current_user)
    policies = commerce_repository.list_active_commission_policies(
        session,
        market_id=order["market_id"],
        service_type=service_type,
    )
    return envelope(data=preview_commission(order, policies), trace_id=request.state.trace_id)


@router.post("/orders/{order_id}/payment-records/placeholder")
def create_payment_placeholder(
    order_id: UUID,
    payload: PaymentPlaceholderCreateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    _ensure_admin_or_support(current_user)
    order = _get_existing_order(session, order_id)
    policies = commerce_repository.list_active_commission_policies(
        session,
        market_id=order["market_id"],
        service_type="guide_service",
    )
    preview = preview_commission(order, policies)
    record = commerce_repository.create_payment_placeholder(
        session,
        order=order,
        preview=preview,
        payment_type=payload.payment_type,
        payment_method_code=payload.payment_method_code,
        payment_country_code=payload.payment_country_code,
        created_by=current_user["id"],
    )
    session.commit()
    return envelope(data=record, trace_id=request.state.trace_id)


@router.post("/markets/{market_id}/me/payout-accounts")
def create_my_payout_account(
    market_id: UUID,
    payload: PayoutAccountCreateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    _ensure_market_exists(session, market_id)
    try:
        account = commerce_repository.create_payout_account(
            session,
            user_id=current_user["id"],
            market_id=market_id,
            account_type=payload.account_type,
            provider_code=payload.provider_code,
            country_code=payload.country_code,
            currency_code=payload.currency_code,
            account_reference=payload.account_reference,
            is_default=payload.is_default,
        )
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail="Invalid payout account reference") from exc
    return envelope(data=account, trace_id=request.state.trace_id)


@router.get("/me/payout-accounts")
def list_my_payout_accounts(
    request: Request,
    market_id: UUID | None = None,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    if market_id is not None:
        _ensure_market_exists(session, market_id)
    accounts = commerce_repository.list_payout_accounts(
        session,
        user_id=current_user["id"],
        market_id=market_id,
    )
    return envelope(data=accounts, trace_id=request.state.trace_id)


@router.post("/markets/{market_id}/membership-plans")
def create_membership_plan(
    market_id: UUID,
    payload: MembershipPlanCreateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    _ensure_market_exists(session, market_id)
    _ensure_admin(current_user)
    plan = commerce_repository.create_membership_plan(
        session,
        market_id=market_id,
        code=payload.code,
        member_role=payload.member_role,
        billing_period=payload.billing_period,
        price_amount=payload.price_amount,
        currency_code=payload.currency_code,
        benefits_json=payload.benefits_json,
        status=payload.status,
        created_by=current_user["id"],
    )
    session.commit()
    return envelope(data=plan, trace_id=request.state.trace_id)


@router.get("/markets/{market_id}/membership-plans")
def list_membership_plans(
    market_id: UUID,
    request: Request,
    session: Session = Depends(get_db_session),
) -> dict:
    _ensure_market_exists(session, market_id)
    return envelope(
        data=commerce_repository.list_membership_plans(session, market_id=market_id),
        trace_id=request.state.trace_id,
    )


@router.post("/membership-plans/{plan_id}/subscriptions")
def create_membership_subscription(
    plan_id: UUID,
    payload: MembershipSubscriptionCreateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    plan = commerce_repository.get_membership_plan(session, plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Membership plan not found")
    subscription = commerce_repository.create_membership_subscription(
        session,
        user_id=current_user["id"],
        plan=plan,
        status=payload.status,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
    )
    session.commit()
    return envelope(data=subscription, trace_id=request.state.trace_id)


@router.get("/me/membership-subscriptions")
def list_my_membership_subscriptions(
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    subscriptions = commerce_repository.list_membership_subscriptions(session, user_id=current_user["id"])
    return envelope(data=subscriptions, trace_id=request.state.trace_id)


@router.post("/orders/{order_id}/disputes")
def create_order_dispute(
    order_id: UUID,
    payload: DisputeCreateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    order = _get_accessible_order(session, order_id, current_user)
    dispute = commerce_repository.create_dispute(
        session,
        order=order,
        raised_by_user_id=current_user["id"],
        dispute_type=payload.dispute_type,
        evidence_json=payload.evidence_json,
    )
    session.commit()
    return envelope(data=dispute, trace_id=request.state.trace_id)


@router.get("/orders/{order_id}/disputes")
def list_order_disputes(
    order_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    _get_order_for_user_or_admin_support(session, order_id, current_user)
    disputes = commerce_repository.list_order_disputes(session, order_id=order_id)
    return envelope(data=disputes, trace_id=request.state.trace_id)


@router.get("/admin/markets/{market_id}/orders")
def admin_list_orders(
    market_id: UUID,
    request: Request,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    _ensure_market_exists(session, market_id)
    _ensure_admin_or_support(current_user)
    orders = commerce_repository.list_admin_orders(
        session,
        market_id=market_id,
        limit=limit,
        offset=offset,
    )
    return envelope(data=orders, meta={"limit": limit, "offset": offset}, trace_id=request.state.trace_id)


@router.get("/admin/markets/{market_id}/disputes")
def admin_list_disputes(
    market_id: UUID,
    request: Request,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    _ensure_market_exists(session, market_id)
    _ensure_admin_or_support(current_user)
    disputes = commerce_repository.list_admin_disputes(
        session,
        market_id=market_id,
        limit=limit,
        offset=offset,
    )
    return envelope(data=disputes, meta={"limit": limit, "offset": offset}, trace_id=request.state.trace_id)


def _ensure_market_exists(session: Session, market_id: UUID) -> None:
    if market_repository.get_market(session, market_id) is None:
        raise HTTPException(status_code=404, detail="Market not found")


def _role_codes(current_user: dict) -> set[str]:
    return {role["code"] for role in current_user["roles"]}


def _ensure_admin(current_user: dict) -> None:
    if not (_role_codes(current_user) & {"sys_admin", "market_admin"}):
        raise HTTPException(status_code=403, detail="Permission denied")


def _ensure_admin_or_support(current_user: dict) -> None:
    if not (_role_codes(current_user) & {"sys_admin", "market_admin", "support_agent"}):
        raise HTTPException(status_code=403, detail="Permission denied")


def _get_existing_order(session: Session, order_id: UUID) -> dict:
    order = order_repository.get_order(session, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


def _get_accessible_order(session: Session, order_id: UUID, current_user: dict) -> dict:
    order = _get_existing_order(session, order_id)
    if current_user["id"] in {order["traveler_user_id"], order["guide_user_id"]}:
        return order
    raise HTTPException(status_code=403, detail="Permission denied")


def _get_order_for_user_or_admin_support(session: Session, order_id: UUID, current_user: dict) -> dict:
    order = _get_existing_order(session, order_id)
    if current_user["id"] in {order["traveler_user_id"], order["guide_user_id"]}:
        return order
    if _role_codes(current_user) & {"sys_admin", "market_admin", "support_agent"}:
        return order
    raise HTTPException(status_code=403, detail="Permission denied")
