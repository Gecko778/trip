import json
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def _dict(row: Any) -> dict[str, Any]:
    return dict(row._mapping)


def list_role_profiles(session: Session, user_id: UUID) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id, user_id, role, market_id, is_active, onboarding_status
            FROM user_role_profiles
            WHERE user_id = :user_id AND deleted_at IS NULL
            ORDER BY role, market_id
            """
        ),
        {"user_id": user_id},
    )
    return [_dict(row) for row in rows]


def update_onboarding_status(
    session: Session,
    user_id: UUID,
    *,
    role: str,
    status: str,
    market_id: UUID | None,
) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            UPDATE user_role_profiles
            SET onboarding_status = :status,
                updated_at = now()
            WHERE user_id = :user_id
              AND role = :role
              AND deleted_at IS NULL
              AND market_id IS NULL
            RETURNING id, user_id, role, market_id, is_active, onboarding_status
            """
        )
        if market_id is None
        else text(
            """
            UPDATE user_role_profiles
            SET onboarding_status = :status,
                updated_at = now()
            WHERE user_id = :user_id
              AND role = :role
              AND market_id = :market_id
              AND deleted_at IS NULL
            RETURNING id, user_id, role, market_id, is_active, onboarding_status
            """
        ),
        {"user_id": user_id, "role": role, "status": status, "market_id": market_id},
    ).first()
    return _dict(row) if row else None


def create_traveler_profile(
    session: Session,
    *,
    user_id: UUID,
    market_id: UUID,
    preference_json: dict[str, Any],
) -> dict[str, Any]:
    row = session.execute(
        text(
            """
            INSERT INTO traveler_profiles (user_id, market_id, preference_json)
            VALUES (:user_id, :market_id, CAST(:preference_json AS jsonb))
            ON CONFLICT (user_id, market_id) DO UPDATE
            SET preference_json = EXCLUDED.preference_json,
                updated_at = now()
            RETURNING id, user_id, market_id, preference_json
            """
        ),
        {
            "user_id": user_id,
            "market_id": market_id,
            "preference_json": json.dumps(preference_json),
        },
    ).first()
    if row is None:
        raise RuntimeError("Failed to create traveler profile")
    return _dict(row)


def get_traveler_profile(session: Session, traveler_profile_id: UUID) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id, user_id, market_id, preference_json
            FROM traveler_profiles
            WHERE id = :profile_id AND deleted_at IS NULL
            """
        ),
        {"profile_id": traveler_profile_id},
    ).first()
    return _dict(row) if row else None


def list_traveler_profiles(session: Session, user_id: UUID) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id, user_id, market_id, preference_json
            FROM traveler_profiles
            WHERE user_id = :user_id AND deleted_at IS NULL
            ORDER BY created_at DESC
            """
        ),
        {"user_id": user_id},
    )
    return [_dict(row) for row in rows]


def update_traveler_profile(
    session: Session,
    traveler_profile_id: UUID,
    *,
    preference_json: dict[str, Any],
) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            UPDATE traveler_profiles
            SET preference_json = CAST(:preference_json AS jsonb),
                updated_at = now()
            WHERE id = :profile_id AND deleted_at IS NULL
            RETURNING id, user_id, market_id, preference_json
            """
        ),
        {"profile_id": traveler_profile_id, "preference_json": json.dumps(preference_json)},
    ).first()
    return _dict(row) if row else None


def create_guide_profile(
    session: Session,
    *,
    user_id: UUID,
    market_id: UUID,
    country_code: str,
    home_region_id: UUID,
    daily_price_amount: Decimal,
    quote_currency: str,
    offers_pickup: bool,
    gender: str,
    birth_year: int | None,
    language_tags: list[str],
    service_region_ids: list[UUID],
) -> dict[str, Any]:
    row = session.execute(
        text(
            """
            INSERT INTO guide_profiles (
                user_id, market_id, country_code, home_region_id, daily_price_amount,
                quote_currency, offers_pickup, gender, birth_year, language_tags
            )
            VALUES (
                :user_id, :market_id, :country_code, :home_region_id, :daily_price_amount,
                :quote_currency, :offers_pickup, :gender, :birth_year, :language_tags
            )
            ON CONFLICT (user_id, market_id) DO UPDATE
            SET country_code = EXCLUDED.country_code,
                home_region_id = EXCLUDED.home_region_id,
                daily_price_amount = EXCLUDED.daily_price_amount,
                quote_currency = EXCLUDED.quote_currency,
                offers_pickup = EXCLUDED.offers_pickup,
                gender = EXCLUDED.gender,
                birth_year = EXCLUDED.birth_year,
                language_tags = EXCLUDED.language_tags,
                updated_at = now()
            RETURNING id, user_id, market_id, country_code, home_region_id,
                      daily_price_amount, quote_currency, offers_pickup, gender, birth_year,
                      language_tags, rating, reputation_status, verification_status,
                      completed_order_count, cancellation_rate, breach_rate,
                      average_response_seconds, badge_status, is_listed
            """
        ),
        {
            "user_id": user_id,
            "market_id": market_id,
            "country_code": country_code.upper(),
            "home_region_id": home_region_id,
            "daily_price_amount": daily_price_amount,
            "quote_currency": quote_currency.upper(),
            "offers_pickup": offers_pickup,
            "gender": gender,
            "birth_year": birth_year,
            "language_tags": language_tags,
        },
    ).first()
    if row is None:
        raise RuntimeError("Failed to create guide profile")
    profile = _dict(row)
    replace_guide_service_regions(session, profile["id"], service_region_ids)
    profile["service_region_ids"] = service_region_ids
    return profile


def get_guide_profile(session: Session, guide_profile_id: UUID) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id, user_id, market_id, country_code, home_region_id,
                   daily_price_amount, quote_currency, offers_pickup, gender, birth_year,
                   language_tags, rating, reputation_status, verification_status,
                   completed_order_count, cancellation_rate, breach_rate,
                   average_response_seconds, badge_status, is_listed
            FROM guide_profiles
            WHERE id = :profile_id AND deleted_at IS NULL
            """
        ),
        {"profile_id": guide_profile_id},
    ).first()
    if row is None:
        return None
    profile = _dict(row)
    profile["service_region_ids"] = list_guide_service_region_ids(session, guide_profile_id)
    return profile


def list_guide_profiles(session: Session, user_id: UUID) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id
            FROM guide_profiles
            WHERE user_id = :user_id AND deleted_at IS NULL
            ORDER BY created_at DESC
            """
        ),
        {"user_id": user_id},
    )
    return [get_guide_profile(session, row[0]) for row in rows]


def list_market_guide_profiles(
    session: Session,
    *,
    market_id: UUID,
    limit: int,
    offset: int,
) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id
            FROM guide_profiles
            WHERE market_id = :market_id AND deleted_at IS NULL
            ORDER BY rating DESC NULLS LAST, created_at DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        {"market_id": market_id, "limit": limit, "offset": offset},
    )
    return [get_guide_profile(session, row[0]) for row in rows]


def update_guide_profile(
    session: Session,
    guide_profile_id: UUID,
    *,
    home_region_id: UUID | None,
    daily_price_amount: Decimal | None,
    quote_currency: str | None,
    offers_pickup: bool | None,
    gender: str | None,
    birth_year: int | None,
    language_tags: list[str] | None,
    service_region_ids: list[UUID] | None,
) -> dict[str, Any] | None:
    current = get_guide_profile(session, guide_profile_id)
    if current is None:
        return None
    row = session.execute(
        text(
            """
            UPDATE guide_profiles
            SET home_region_id = :home_region_id,
                daily_price_amount = :daily_price_amount,
                quote_currency = :quote_currency,
                offers_pickup = :offers_pickup,
                gender = :gender,
                birth_year = :birth_year,
                language_tags = :language_tags,
                updated_at = now()
            WHERE id = :profile_id AND deleted_at IS NULL
            RETURNING id
            """
        ),
        {
            "profile_id": guide_profile_id,
            "home_region_id": home_region_id or current["home_region_id"],
            "daily_price_amount": daily_price_amount
            if daily_price_amount is not None
            else current["daily_price_amount"],
            "quote_currency": quote_currency.upper() if quote_currency else current["quote_currency"],
            "offers_pickup": offers_pickup
            if offers_pickup is not None
            else current["offers_pickup"],
            "gender": gender or current["gender"],
            "birth_year": birth_year if birth_year is not None else current["birth_year"],
            "language_tags": language_tags if language_tags is not None else current["language_tags"],
        },
    ).first()
    if row is None:
        return None
    if service_region_ids is not None:
        replace_guide_service_regions(session, guide_profile_id, service_region_ids)
    return get_guide_profile(session, guide_profile_id)


def list_guide_service_region_ids(session: Session, guide_profile_id: UUID) -> list[UUID]:
    rows = session.execute(
        text(
            """
            SELECT region_id
            FROM guide_service_regions
            WHERE guide_profile_id = :profile_id
            ORDER BY created_at
            """
        ),
        {"profile_id": guide_profile_id},
    )
    return [row[0] for row in rows]


def replace_guide_service_regions(
    session: Session,
    guide_profile_id: UUID,
    service_region_ids: list[UUID],
) -> None:
    session.execute(
        text("DELETE FROM guide_service_regions WHERE guide_profile_id = :profile_id"),
        {"profile_id": guide_profile_id},
    )
    for region_id in service_region_ids:
        session.execute(
            text(
                """
                INSERT INTO guide_service_regions (guide_profile_id, region_id)
                VALUES (:profile_id, :region_id)
                ON CONFLICT (guide_profile_id, region_id) DO NOTHING
                """
            ),
            {"profile_id": guide_profile_id, "region_id": region_id},
        )


def submit_guide_verification(
    session: Session,
    guide_profile_id: UUID,
    *,
    user_id: UUID,
) -> dict[str, Any] | None:
    profile = get_guide_profile(session, guide_profile_id)
    if profile is None:
        return None
    row = session.execute(
        text(
            """
            INSERT INTO guide_verifications (
                guide_profile_id, market_id, identity_status, qualification_status,
                real_avatar_status, service_region_status, language_status,
                badge_status, submitted_at, created_by
            )
            VALUES (
                :guide_profile_id, :market_id, 'pending', 'pending',
                'pending', 'pending', 'pending', 'submitted', now(), :user_id
            )
            RETURNING id
            """
        ),
        {
            "guide_profile_id": guide_profile_id,
            "market_id": profile["market_id"],
            "user_id": user_id,
        },
    ).first()
    session.execute(
        text(
            """
            UPDATE guide_profiles
            SET verification_status = 'pending',
                updated_at = now()
            WHERE id = :guide_profile_id
            """
        ),
        {"guide_profile_id": guide_profile_id},
    )
    return get_guide_verification(session, row[0]) if row else None


def get_guide_verification_by_profile(
    session: Session,
    guide_profile_id: UUID,
) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id
            FROM guide_verifications
            WHERE guide_profile_id = :guide_profile_id AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {"guide_profile_id": guide_profile_id},
    ).first()
    return get_guide_verification(session, row[0]) if row else None


def get_guide_verification(session: Session, verification_id: UUID) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id, guide_profile_id, market_id, identity_status, qualification_status,
                   real_avatar_status, service_region_status, language_status,
                   badge_status, failure_reason, appeal_status, submitted_at,
                   reviewed_at, reviewed_by
            FROM guide_verifications
            WHERE id = :verification_id AND deleted_at IS NULL
            """
        ),
        {"verification_id": verification_id},
    ).first()
    return _dict(row) if row else None


def review_guide_verification(
    session: Session,
    verification_id: UUID,
    *,
    reviewer_user_id: UUID,
    status: str,
    failure_reason: str | None,
) -> dict[str, Any] | None:
    current = get_guide_verification(session, verification_id)
    if current is None:
        return None
    row = session.execute(
        text(
            """
            UPDATE guide_verifications
            SET identity_status = CAST(:verification_status AS verification_status_enum),
                qualification_status = CAST(:verification_status AS verification_status_enum),
                real_avatar_status = CAST(:verification_status AS verification_status_enum),
                service_region_status = CAST(:verification_status AS verification_status_enum),
                language_status = CAST(:verification_status AS verification_status_enum),
                badge_status = CAST(:badge_status AS status_enum),
                failure_reason = :failure_reason,
                reviewed_at = now(),
                reviewed_by = :reviewer_user_id,
                updated_at = now()
            WHERE id = :verification_id AND deleted_at IS NULL
            RETURNING id
            """
        ),
        {
            "verification_id": verification_id,
            "reviewer_user_id": reviewer_user_id,
            "verification_status": status,
            "badge_status": status,
            "failure_reason": failure_reason,
        },
    ).first()
    if row is None:
        return None
    session.execute(
        text(
            """
            UPDATE guide_profiles
            SET verification_status = CAST(:status AS verification_status_enum),
                updated_at = now()
            WHERE id = :guide_profile_id AND deleted_at IS NULL
            """
        ),
        {"guide_profile_id": current["guide_profile_id"], "status": status},
    )
    return get_guide_verification(session, verification_id)
