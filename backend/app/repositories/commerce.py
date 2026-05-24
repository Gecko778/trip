import json
from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def _dict(row: Any) -> dict[str, Any]:
    return dict(row._mapping)


def create_commission_policy(
    session: Session,
    *,
    market_id: UUID,
    service_type: str,
    commission_type: str,
    commission_rate: Decimal | None,
    fixed_service_fee_amount: Decimal | None,
    currency_code: str | None,
    min_fee_amount: Decimal | None,
    max_fee_amount: Decimal | None,
    status: str,
    effective_at: datetime | None,
    expires_at: datetime | None,
    created_by: UUID,
) -> dict[str, Any]:
    row = session.execute(
        text(
            """
            INSERT INTO commission_policies (
                market_id, service_type, commission_type, commission_rate,
                fixed_service_fee_amount, currency_code, min_fee_amount, max_fee_amount,
                status, effective_at, expires_at, created_by, updated_by
            )
            VALUES (
                :market_id, :service_type, :commission_type, :commission_rate,
                :fixed_service_fee_amount, :currency_code, :min_fee_amount, :max_fee_amount,
                CAST(:status AS status_enum), :effective_at, :expires_at, :created_by, :created_by
            )
            RETURNING id
            """
        ),
        {
            "market_id": market_id,
            "service_type": service_type,
            "commission_type": commission_type,
            "commission_rate": commission_rate,
            "fixed_service_fee_amount": fixed_service_fee_amount,
            "currency_code": currency_code.upper() if currency_code else None,
            "min_fee_amount": min_fee_amount,
            "max_fee_amount": max_fee_amount,
            "status": status,
            "effective_at": effective_at,
            "expires_at": expires_at,
            "created_by": created_by,
        },
    ).first()
    if row is None:
        raise RuntimeError("Failed to create commission policy")
    return get_commission_policy(session, row[0])


def get_commission_policy(session: Session, policy_id: UUID) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id, market_id, service_type, commission_type, commission_rate,
                   fixed_service_fee_amount, currency_code, min_fee_amount, max_fee_amount,
                   membership_discount_enabled, status, effective_at, expires_at,
                   created_at, updated_at
            FROM commission_policies
            WHERE id = :policy_id AND deleted_at IS NULL
            """
        ),
        {"policy_id": policy_id},
    ).first()
    return _dict(row) if row else None


def list_commission_policies(
    session: Session,
    *,
    market_id: UUID,
    service_type: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    conditions = ["market_id = :market_id", "deleted_at IS NULL"]
    params: dict[str, Any] = {"market_id": market_id}
    if service_type is not None:
        conditions.append("service_type = :service_type")
        params["service_type"] = service_type
    if status is not None:
        conditions.append("status = CAST(:status AS status_enum)")
        params["status"] = status
    rows = session.execute(
        text(
            f"""
            SELECT id, market_id, service_type, commission_type, commission_rate,
                   fixed_service_fee_amount, currency_code, min_fee_amount, max_fee_amount,
                   membership_discount_enabled, status, effective_at, expires_at,
                   created_at, updated_at
            FROM commission_policies
            WHERE {" AND ".join(conditions)}
            ORDER BY created_at DESC
            """
        ),
        params,
    )
    return [_dict(row) for row in rows]


def list_active_commission_policies(
    session: Session,
    *,
    market_id: UUID,
    service_type: str,
) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id, market_id, service_type, commission_type, commission_rate,
                   fixed_service_fee_amount, currency_code, min_fee_amount, max_fee_amount,
                   membership_discount_enabled, status, effective_at, expires_at,
                   created_at, updated_at
            FROM commission_policies
            WHERE market_id = :market_id
              AND service_type = :service_type
              AND status = 'active'
              AND deleted_at IS NULL
              AND (effective_at IS NULL OR effective_at <= now())
              AND (expires_at IS NULL OR expires_at > now())
            ORDER BY created_at ASC
            """
        ),
        {"market_id": market_id, "service_type": service_type},
    )
    return [_dict(row) for row in rows]


def create_payment_placeholder(
    session: Session,
    *,
    order: dict[str, Any],
    preview: dict[str, Any],
    payment_type: str,
    payment_method_code: str | None,
    payment_country_code: str | None,
    created_by: UUID,
) -> dict[str, Any]:
    policy_id = None
    for item in preview["items"]:
        if not item["skipped"]:
            policy_id = item["policy"]["id"]
            break
    row = session.execute(
        text(
            """
            INSERT INTO payment_records (
                order_id, market_id, payment_method_code, payment_type,
                full_amount, platform_commission_amount, platform_service_fee_amount,
                guide_quote_amount, guide_quote_currency, traveler_display_amount,
                traveler_display_currency, guide_settlement_amount, guide_settlement_currency,
                commission_policy_id, payment_country_code, transaction_status,
                created_by, updated_by
            )
            VALUES (
                :order_id, :market_id, :payment_method_code, :payment_type,
                :full_amount, :platform_commission_amount, :platform_service_fee_amount,
                :guide_quote_amount, :guide_quote_currency, :traveler_display_amount,
                :traveler_display_currency, :guide_settlement_amount, :guide_settlement_currency,
                :commission_policy_id, :payment_country_code,
                CAST('pending' AS payment_status_enum), :created_by, :created_by
            )
            RETURNING id
            """
        ),
        {
            "order_id": order["id"],
            "market_id": order["market_id"],
            "payment_method_code": payment_method_code,
            "payment_type": payment_type,
            "full_amount": order["guide_price_amount"],
            "platform_commission_amount": preview["platform_commission_amount"],
            "platform_service_fee_amount": preview["platform_service_fee_amount"],
            "guide_quote_amount": preview["guide_quote_amount"],
            "guide_quote_currency": preview["currency_code"],
            "traveler_display_amount": order["traveler_display_amount"],
            "traveler_display_currency": order["traveler_display_currency"],
            "guide_settlement_amount": preview["guide_settlement_amount"],
            "guide_settlement_currency": preview["currency_code"],
            "commission_policy_id": policy_id,
            "payment_country_code": payment_country_code.upper() if payment_country_code else None,
            "created_by": created_by,
        },
    ).first()
    if row is None:
        raise RuntimeError("Failed to create payment placeholder")
    return get_payment_record(session, row[0])


def get_payment_record(session: Session, payment_record_id: UUID) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id, order_id, market_id, provider_code, payment_method_code, payment_type,
                   full_amount, platform_commission_amount, platform_service_fee_amount,
                   guide_quote_amount, guide_quote_currency, traveler_display_amount,
                   traveler_display_currency, paid_amount, paid_currency,
                   guide_settlement_amount, guide_settlement_currency,
                   commission_policy_id, payment_country_code, transaction_status,
                   created_at, updated_at
            FROM payment_records
            WHERE id = :payment_record_id AND deleted_at IS NULL
            """
        ),
        {"payment_record_id": payment_record_id},
    ).first()
    return _dict(row) if row else None


def create_payout_account(
    session: Session,
    *,
    user_id: UUID,
    market_id: UUID,
    account_type: str,
    provider_code: str,
    country_code: str,
    currency_code: str,
    account_reference: str | None,
    is_default: bool,
) -> dict[str, Any]:
    if is_default:
        session.execute(
            text(
                """
                UPDATE payout_accounts
                SET is_default = false,
                    updated_at = now()
                WHERE user_id = :user_id AND market_id = :market_id AND deleted_at IS NULL
                """
            ),
            {"user_id": user_id, "market_id": market_id},
        )
    row = session.execute(
        text(
            """
            INSERT INTO payout_accounts (
                user_id, market_id, account_type, provider_code, country_code,
                currency_code, account_reference, is_default, created_by, updated_by
            )
            VALUES (
                :user_id, :market_id, :account_type, :provider_code, :country_code,
                :currency_code, :account_reference, :is_default, :user_id, :user_id
            )
            RETURNING id
            """
        ),
        {
            "user_id": user_id,
            "market_id": market_id,
            "account_type": account_type,
            "provider_code": provider_code,
            "country_code": country_code.upper(),
            "currency_code": currency_code.upper(),
            "account_reference": account_reference,
            "is_default": is_default,
        },
    ).first()
    if row is None:
        raise RuntimeError("Failed to create payout account")
    return get_payout_account(session, row[0])


def get_payout_account(session: Session, payout_account_id: UUID) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id, user_id, market_id, account_type, provider_code, country_code,
                   currency_code, account_reference, verification_status, kyc_status,
                   is_default, created_at, updated_at
            FROM payout_accounts
            WHERE id = :payout_account_id AND deleted_at IS NULL
            """
        ),
        {"payout_account_id": payout_account_id},
    ).first()
    return _dict(row) if row else None


def list_payout_accounts(session: Session, *, user_id: UUID, market_id: UUID | None) -> list[dict[str, Any]]:
    conditions = ["user_id = :user_id", "deleted_at IS NULL"]
    params: dict[str, Any] = {"user_id": user_id}
    if market_id is not None:
        conditions.append("market_id = :market_id")
        params["market_id"] = market_id
    rows = session.execute(
        text(
            f"""
            SELECT id, user_id, market_id, account_type, provider_code, country_code,
                   currency_code, account_reference, verification_status, kyc_status,
                   is_default, created_at, updated_at
            FROM payout_accounts
            WHERE {" AND ".join(conditions)}
            ORDER BY is_default DESC, created_at DESC
            """
        ),
        params,
    )
    return [_dict(row) for row in rows]


def create_membership_plan(
    session: Session,
    *,
    market_id: UUID,
    code: str,
    member_role: str,
    billing_period: str,
    price_amount: Decimal,
    currency_code: str,
    benefits_json: dict[str, Any],
    status: str,
    created_by: UUID,
) -> dict[str, Any]:
    row = session.execute(
        text(
            """
            INSERT INTO membership_plans (
                market_id, code, member_role, billing_period, price_amount,
                currency_code, benefits_json, status, created_by, updated_by
            )
            VALUES (
                :market_id, :code, CAST(:member_role AS user_role_enum), :billing_period,
                :price_amount, :currency_code, CAST(:benefits_json AS jsonb),
                CAST(:status AS status_enum), :created_by, :created_by
            )
            ON CONFLICT (market_id, code) DO UPDATE
            SET member_role = EXCLUDED.member_role,
                billing_period = EXCLUDED.billing_period,
                price_amount = EXCLUDED.price_amount,
                currency_code = EXCLUDED.currency_code,
                benefits_json = EXCLUDED.benefits_json,
                status = EXCLUDED.status,
                updated_by = EXCLUDED.updated_by,
                updated_at = now()
            RETURNING id
            """
        ),
        {
            "market_id": market_id,
            "code": code,
            "member_role": member_role,
            "billing_period": billing_period,
            "price_amount": price_amount,
            "currency_code": currency_code.upper(),
            "benefits_json": json.dumps(benefits_json),
            "status": status,
            "created_by": created_by,
        },
    ).first()
    if row is None:
        raise RuntimeError("Failed to create membership plan")
    return get_membership_plan(session, row[0])


def get_membership_plan(session: Session, plan_id: UUID) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id, market_id, code, member_role, billing_period, price_amount,
                   currency_code, benefits_json, status, created_at, updated_at
            FROM membership_plans
            WHERE id = :plan_id AND deleted_at IS NULL
            """
        ),
        {"plan_id": plan_id},
    ).first()
    return _dict(row) if row else None


def list_membership_plans(session: Session, *, market_id: UUID) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id, market_id, code, member_role, billing_period, price_amount,
                   currency_code, benefits_json, status, created_at, updated_at
            FROM membership_plans
            WHERE market_id = :market_id AND deleted_at IS NULL
            ORDER BY code
            """
        ),
        {"market_id": market_id},
    )
    return [_dict(row) for row in rows]


def create_membership_subscription(
    session: Session,
    *,
    user_id: UUID,
    plan: dict[str, Any],
    status: str,
    starts_at: datetime | None,
    ends_at: datetime | None,
) -> dict[str, Any]:
    row = session.execute(
        text(
            """
            INSERT INTO membership_subscriptions (
                user_id, plan_id, market_id, status, starts_at, ends_at
            )
            VALUES (
                :user_id, :plan_id, :market_id, CAST(:status AS status_enum),
                :starts_at, :ends_at
            )
            RETURNING id
            """
        ),
        {
            "user_id": user_id,
            "plan_id": plan["id"],
            "market_id": plan["market_id"],
            "status": status,
            "starts_at": starts_at,
            "ends_at": ends_at,
        },
    ).first()
    if row is None:
        raise RuntimeError("Failed to create membership subscription")
    return get_membership_subscription(session, row[0])


def get_membership_subscription(session: Session, subscription_id: UUID) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id, user_id, plan_id, market_id, status, starts_at, ends_at,
                   created_at, updated_at
            FROM membership_subscriptions
            WHERE id = :subscription_id AND deleted_at IS NULL
            """
        ),
        {"subscription_id": subscription_id},
    ).first()
    return _dict(row) if row else None


def list_membership_subscriptions(session: Session, *, user_id: UUID) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id, user_id, plan_id, market_id, status, starts_at, ends_at,
                   created_at, updated_at
            FROM membership_subscriptions
            WHERE user_id = :user_id AND deleted_at IS NULL
            ORDER BY created_at DESC
            """
        ),
        {"user_id": user_id},
    )
    return [_dict(row) for row in rows]


def create_dispute(
    session: Session,
    *,
    order: dict[str, Any],
    raised_by_user_id: UUID,
    dispute_type: str,
    evidence_json: dict[str, Any],
) -> dict[str, Any]:
    row = session.execute(
        text(
            """
            INSERT INTO dispute_cases (
                market_id, order_id, raised_by_user_id, dispute_type,
                evidence_json, status, created_by, updated_by
            )
            VALUES (
                :market_id, :order_id, :raised_by_user_id, :dispute_type,
                CAST(:evidence_json AS jsonb), CAST('submitted' AS status_enum),
                :raised_by_user_id, :raised_by_user_id
            )
            RETURNING id
            """
        ),
        {
            "market_id": order["market_id"],
            "order_id": order["id"],
            "raised_by_user_id": raised_by_user_id,
            "dispute_type": dispute_type,
            "evidence_json": json.dumps(evidence_json),
        },
    ).first()
    if row is None:
        raise RuntimeError("Failed to create dispute")
    return get_dispute(session, row[0])


def get_dispute(session: Session, dispute_id: UUID) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id, market_id, order_id, raised_by_user_id, dispute_type,
                   evidence_json, status, arbitration_result, due_at, created_at, updated_at
            FROM dispute_cases
            WHERE id = :dispute_id AND deleted_at IS NULL
            """
        ),
        {"dispute_id": dispute_id},
    ).first()
    return _dict(row) if row else None


def list_order_disputes(session: Session, *, order_id: UUID) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id, market_id, order_id, raised_by_user_id, dispute_type,
                   evidence_json, status, arbitration_result, due_at, created_at, updated_at
            FROM dispute_cases
            WHERE order_id = :order_id AND deleted_at IS NULL
            ORDER BY created_at DESC
            """
        ),
        {"order_id": order_id},
    )
    return [_dict(row) for row in rows]


def list_admin_orders(
    session: Session,
    *,
    market_id: UUID,
    limit: int,
    offset: int,
) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id, market_id, traveler_user_id, guide_user_id, travel_plan_id,
                   message_thread_id, guide_price_amount, guide_price_currency,
                   traveler_display_amount, traveler_display_currency,
                   service_start_date, service_end_date, service_region_id,
                   needs_pickup, traveler_count, traveler_price_confirmed_at,
                   guide_itinerary_confirmed_at, status, payment_status,
                   itinerary_json, cancellation_policy, breach_responsibility,
                   canceled_at, canceled_by_user_id, cancellation_reason,
                   cancellation_penalty_applied, cancellation_penalty_note,
                   created_at, updated_at
            FROM service_orders
            WHERE market_id = :market_id AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        {"market_id": market_id, "limit": limit, "offset": offset},
    )
    return [_dict(row) for row in rows]


def list_admin_disputes(
    session: Session,
    *,
    market_id: UUID,
    limit: int,
    offset: int,
) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id, market_id, order_id, raised_by_user_id, dispute_type,
                   evidence_json, status, arbitration_result, due_at, created_at, updated_at
            FROM dispute_cases
            WHERE market_id = :market_id AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        {"market_id": market_id, "limit": limit, "offset": offset},
    )
    return [_dict(row) for row in rows]
