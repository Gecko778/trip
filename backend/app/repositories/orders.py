import json
from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def _dict(row: Any) -> dict[str, Any]:
    return dict(row._mapping)


def guide_has_profile(session: Session, *, guide_user_id: UUID, market_id: UUID) -> bool:
    row = session.execute(
        text(
            """
            SELECT 1
            FROM guide_profiles
            WHERE user_id = :guide_user_id
              AND market_id = :market_id
              AND deleted_at IS NULL
            LIMIT 1
            """
        ),
        {"guide_user_id": guide_user_id, "market_id": market_id},
    ).first()
    return row is not None


def create_order(
    session: Session,
    *,
    market_id: UUID,
    traveler_user_id: UUID,
    guide_user_id: UUID,
    travel_plan_id: UUID | None,
    message_thread_id: UUID | None,
    guide_price_amount: Decimal,
    guide_price_currency: str,
    service_start_date: date,
    service_end_date: date | None,
    service_region_id: UUID | None,
    needs_pickup: bool,
    traveler_count: int,
    itinerary_json: dict[str, Any],
    cancellation_policy: str,
    breach_responsibility: str,
    created_by: UUID,
) -> dict[str, Any]:
    row = session.execute(
        text(
            """
            INSERT INTO service_orders (
                market_id, traveler_user_id, guide_user_id, travel_plan_id,
                message_thread_id, guide_price_amount, guide_price_currency,
                service_start_date, service_end_date, service_region_id,
                needs_pickup, traveler_count, itinerary_json,
                cancellation_policy, breach_responsibility, status, payment_status,
                created_by, updated_by
            )
            VALUES (
                :market_id, :traveler_user_id, :guide_user_id, :travel_plan_id,
                :message_thread_id, :guide_price_amount, :guide_price_currency,
                :service_start_date, :service_end_date, :service_region_id,
                :needs_pickup, :traveler_count, CAST(:itinerary_json AS jsonb),
                :cancellation_policy, :breach_responsibility,
                CAST('pending_both_confirm' AS order_status_enum),
                CAST('not_required' AS payment_status_enum),
                :created_by, :created_by
            )
            RETURNING id
            """
        ),
        {
            "market_id": market_id,
            "traveler_user_id": traveler_user_id,
            "guide_user_id": guide_user_id,
            "travel_plan_id": travel_plan_id,
            "message_thread_id": message_thread_id,
            "guide_price_amount": guide_price_amount,
            "guide_price_currency": guide_price_currency.upper(),
            "service_start_date": service_start_date,
            "service_end_date": service_end_date,
            "service_region_id": service_region_id,
            "needs_pickup": needs_pickup,
            "traveler_count": traveler_count,
            "itinerary_json": json.dumps(itinerary_json),
            "cancellation_policy": cancellation_policy,
            "breach_responsibility": breach_responsibility,
            "created_by": created_by,
        },
    ).first()
    if row is None:
        raise RuntimeError("Failed to create order")
    order_id = row[0]
    if message_thread_id is not None:
        session.execute(
            text(
                """
                UPDATE message_threads
                SET order_id = :order_id,
                    updated_at = now()
                WHERE id = :message_thread_id
                """
            ),
            {"order_id": order_id, "message_thread_id": message_thread_id},
        )
    return get_order(session, order_id)


def list_orders(
    session: Session,
    *,
    market_id: UUID,
    user_id: UUID,
    limit: int,
    offset: int,
) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id
            FROM service_orders
            WHERE market_id = :market_id
              AND deleted_at IS NULL
              AND (traveler_user_id = :user_id OR guide_user_id = :user_id)
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        {"market_id": market_id, "user_id": user_id, "limit": limit, "offset": offset},
    )
    return [get_order(session, row[0]) for row in rows]


def get_order(session: Session, order_id: UUID) -> dict[str, Any] | None:
    row = session.execute(
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
            WHERE id = :order_id AND deleted_at IS NULL
            """
        ),
        {"order_id": order_id},
    ).first()
    return _dict(row) if row else None


def confirm_order(session: Session, *, order: dict[str, Any], actor_role: str, actor_user_id: UUID) -> dict[str, Any]:
    if actor_role == "traveler":
        traveler_confirmed_at = "COALESCE(traveler_price_confirmed_at, now())"
        guide_confirmed_at = "guide_itinerary_confirmed_at"
    else:
        traveler_confirmed_at = "traveler_price_confirmed_at"
        guide_confirmed_at = "COALESCE(guide_itinerary_confirmed_at, now())"
    row = session.execute(
        text(
            f"""
            UPDATE service_orders
            SET traveler_price_confirmed_at = {traveler_confirmed_at},
                guide_itinerary_confirmed_at = {guide_confirmed_at},
                status = CASE
                    WHEN {traveler_confirmed_at} IS NOT NULL
                     AND {guide_confirmed_at} IS NOT NULL
                    THEN CAST('pending_agreement' AS order_status_enum)
                    WHEN {traveler_confirmed_at} IS NOT NULL
                    THEN CAST('pending_guide_confirm' AS order_status_enum)
                    WHEN {guide_confirmed_at} IS NOT NULL
                    THEN CAST('pending_traveler_confirm' AS order_status_enum)
                    ELSE CAST('pending_both_confirm' AS order_status_enum)
                END,
                updated_by = :actor_user_id,
                updated_at = now()
            WHERE id = :order_id
              AND deleted_at IS NULL
              AND status NOT IN ('cancelled', 'completed', 'closed', 'disputed')
            RETURNING id
            """
        ),
        {"order_id": order["id"], "actor_user_id": actor_user_id},
    ).first()
    return get_order(session, row[0]) if row else None


def get_agreement_by_order(session: Session, order_id: UUID) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id, market_id, traveler_user_id, guide_user_id, order_id,
                   agreement_version, status, service_start_date, service_end_date,
                   service_region_id, price_amount, price_currency,
                   cancellation_policy, breach_responsibility,
                   traveler_signed_at, guide_signed_at, breached_at, breach_reason,
                   reputation_effect_json, created_at, updated_at
            FROM anonymous_agreements
            WHERE order_id = :order_id AND deleted_at IS NULL
            """
        ),
        {"order_id": order_id},
    ).first()
    return _dict(row) if row else None


def get_or_create_agreement(session: Session, *, order: dict[str, Any], actor_user_id: UUID) -> dict[str, Any]:
    existing = get_agreement_by_order(session, order["id"])
    if existing is not None:
        return existing
    row = session.execute(
        text(
            """
            INSERT INTO anonymous_agreements (
                market_id, traveler_user_id, guide_user_id, order_id,
                agreement_version, status, service_start_date, service_end_date,
                service_region_id, price_amount, price_currency,
                cancellation_policy, breach_responsibility, created_by, updated_by
            )
            VALUES (
                :market_id, :traveler_user_id, :guide_user_id, :order_id,
                'mvp-v1', CAST('pending_sign' AS agreement_status_enum),
                :service_start_date, :service_end_date, :service_region_id,
                :price_amount, :price_currency, :cancellation_policy,
                :breach_responsibility, :actor_user_id, :actor_user_id
            )
            RETURNING id
            """
        ),
        {
            "market_id": order["market_id"],
            "traveler_user_id": order["traveler_user_id"],
            "guide_user_id": order["guide_user_id"],
            "order_id": order["id"],
            "service_start_date": order["service_start_date"],
            "service_end_date": order["service_end_date"],
            "service_region_id": order["service_region_id"],
            "price_amount": order["guide_price_amount"],
            "price_currency": order["guide_price_currency"],
            "cancellation_policy": order["cancellation_policy"],
            "breach_responsibility": order["breach_responsibility"],
            "actor_user_id": actor_user_id,
        },
    ).first()
    if row is None:
        raise RuntimeError("Failed to create agreement")
    return get_agreement_by_order(session, order["id"])


def sign_agreement(
    session: Session,
    *,
    agreement: dict[str, Any],
    actor_role: str,
    actor_user_id: UUID,
) -> dict[str, Any]:
    if actor_role == "traveler":
        traveler_signed_at = "COALESCE(traveler_signed_at, now())"
        guide_signed_at = "guide_signed_at"
    else:
        traveler_signed_at = "traveler_signed_at"
        guide_signed_at = "COALESCE(guide_signed_at, now())"
    row = session.execute(
        text(
            f"""
            UPDATE anonymous_agreements
            SET traveler_signed_at = {traveler_signed_at},
                guide_signed_at = {guide_signed_at},
                status = CASE
                    WHEN {traveler_signed_at} IS NOT NULL
                     AND {guide_signed_at} IS NOT NULL
                    THEN CAST('signed' AS agreement_status_enum)
                    ELSE CAST('pending_sign' AS agreement_status_enum)
                END,
                updated_by = :actor_user_id,
                updated_at = now()
            WHERE id = :agreement_id
              AND deleted_at IS NULL
              AND status IN ('draft', 'pending_sign', 'signed')
            RETURNING id, status
            """
        ),
        {"agreement_id": agreement["id"], "actor_user_id": actor_user_id},
    ).first()
    if row is None:
        raise RuntimeError("Failed to sign agreement")
    signed = get_agreement_by_order(session, agreement["order_id"])
    if signed["status"] == "signed":
        session.execute(
            text(
                """
                UPDATE service_orders
                SET status = CAST('confirmed' AS order_status_enum),
                    updated_by = :actor_user_id,
                    updated_at = now()
                WHERE id = :order_id
                  AND deleted_at IS NULL
                  AND status <> 'cancelled'
                """
            ),
            {"order_id": agreement["order_id"], "actor_user_id": actor_user_id},
        )
    return signed


def cancel_order(
    session: Session,
    *,
    order_id: UUID,
    actor_user_id: UUID,
    reason: str | None,
) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            UPDATE service_orders
            SET status = CAST('cancelled' AS order_status_enum),
                canceled_at = now(),
                canceled_by_user_id = :actor_user_id,
                cancellation_reason = :reason,
                cancellation_penalty_applied = (
                    service_start_date IS NOT NULL
                    AND service_start_date <= CURRENT_DATE + INTERVAL '1 day'
                ),
                cancellation_penalty_note = CASE
                    WHEN service_start_date IS NOT NULL
                     AND service_start_date <= CURRENT_DATE + INTERVAL '1 day'
                    THEN 'Cancelled within 24 hours; exact penalty rule is deferred.'
                    ELSE NULL
                END,
                updated_by = :actor_user_id,
                updated_at = now()
            WHERE id = :order_id
              AND deleted_at IS NULL
              AND status NOT IN ('cancelled', 'completed', 'closed')
            RETURNING id
            """
        ),
        {"order_id": order_id, "actor_user_id": actor_user_id, "reason": reason},
    ).first()
    return get_order(session, row[0]) if row else None


def complete_order(session: Session, *, order_id: UUID, actor_user_id: UUID) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            UPDATE service_orders
            SET status = CAST('completed' AS order_status_enum),
                updated_by = :actor_user_id,
                updated_at = now()
            WHERE id = :order_id
              AND deleted_at IS NULL
              AND status IN ('confirmed', 'in_service')
            RETURNING id
            """
        ),
        {"order_id": order_id, "actor_user_id": actor_user_id},
    ).first()
    return get_order(session, row[0]) if row else None


def create_review(
    session: Session,
    *,
    order: dict[str, Any],
    reviewer_user_id: UUID,
    reviewee_user_id: UUID,
    rating: Decimal,
    body: str | None,
    dimensions_json: dict[str, Any],
) -> dict[str, Any]:
    row = session.execute(
        text(
            """
            INSERT INTO review_records (
                market_id, order_id, reviewer_user_id, reviewee_user_id,
                region_id, dimensions_json, rating, body, created_by, updated_by
            )
            VALUES (
                :market_id, :order_id, :reviewer_user_id, :reviewee_user_id,
                :region_id, CAST(:dimensions_json AS jsonb), :rating, :body,
                :reviewer_user_id, :reviewer_user_id
            )
            RETURNING id, market_id, order_id, reviewer_user_id, reviewee_user_id,
                      region_id, dimensions_json, rating, body, media_urls,
                      is_featured, dispute_status, created_at, updated_at
            """
        ),
        {
            "market_id": order["market_id"],
            "order_id": order["id"],
            "reviewer_user_id": reviewer_user_id,
            "reviewee_user_id": reviewee_user_id,
            "region_id": order["service_region_id"],
            "dimensions_json": json.dumps(dimensions_json),
            "rating": rating,
            "body": body,
        },
    ).first()
    if row is None:
        raise RuntimeError("Failed to create review")
    return _dict(row)


def list_order_reviews(session: Session, order_id: UUID) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id, market_id, order_id, reviewer_user_id, reviewee_user_id,
                   region_id, dimensions_json, rating, body, media_urls,
                   is_featured, dispute_status, created_at, updated_at
            FROM review_records
            WHERE order_id = :order_id AND deleted_at IS NULL
            ORDER BY created_at ASC
            """
        ),
        {"order_id": order_id},
    )
    return [_dict(row) for row in rows]
