from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def _dict(row: Any) -> dict[str, Any]:
    return dict(row._mapping)


def normalize_identifier(provider: str, identifier: str) -> str:
    value = identifier.strip()
    if provider == "email":
        return value.lower()
    return value


def create_user_with_password_identity(
    session: Session,
    *,
    provider: str,
    identifier: str,
    password_hash: str,
    display_name: str,
    preferred_locale: str,
    preferred_currency: str,
    default_role_code: str = "traveler",
    market_id: UUID | None = None,
) -> dict[str, Any]:
    user = session.execute(
        text(
            """
            INSERT INTO users (display_name, preferred_locale, preferred_currency)
            VALUES (:display_name, :preferred_locale, :preferred_currency)
            RETURNING id, display_name, avatar_url, preferred_locale, preferred_currency,
                      risk_level, status
            """
        ),
        {
            "display_name": display_name,
            "preferred_locale": preferred_locale,
            "preferred_currency": preferred_currency,
        },
    ).first()
    if user is None:
        raise RuntimeError("Failed to create user")
    user_data = _dict(user)
    session.execute(
        text(
            """
            INSERT INTO user_auth_identities (
                user_id, provider, identifier, password_hash, verified_at
            )
            VALUES (:user_id, :provider, :identifier, :password_hash, now())
            """
        ),
        {
            "user_id": user_data["id"],
            "provider": provider,
            "identifier": normalize_identifier(provider, identifier),
            "password_hash": password_hash,
        },
    )
    assign_role(session, user_data["id"], default_role_code, market_id=market_id)
    create_role_profile(session, user_data["id"], default_role_code, market_id=market_id)
    return user_data


def get_identity_for_login(session: Session, provider: str, identifier: str) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT i.id, i.user_id, i.provider, i.identifier, i.password_hash,
                   u.display_name, u.avatar_url, u.preferred_locale, u.preferred_currency,
                   u.risk_level, u.status
            FROM user_auth_identities i
            JOIN users u ON u.id = i.user_id
            WHERE i.provider = :provider
              AND i.identifier = :identifier
              AND i.deleted_at IS NULL
              AND u.deleted_at IS NULL
            """
        ),
        {"provider": provider, "identifier": normalize_identifier(provider, identifier)},
    ).first()
    return _dict(row) if row else None


def get_user(session: Session, user_id: UUID) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id, display_name, avatar_url, preferred_locale, preferred_currency,
                   risk_level, status
            FROM users
            WHERE id = :user_id AND deleted_at IS NULL
            """
        ),
        {"user_id": user_id},
    ).first()
    return _dict(row) if row else None


def list_users(session: Session, *, limit: int, offset: int) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id, display_name, avatar_url, preferred_locale, preferred_currency,
                   risk_level, status, created_at
            FROM users
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        {"limit": limit, "offset": offset},
    )
    return [_dict(row) for row in rows]


def update_user(
    session: Session,
    user_id: UUID,
    *,
    display_name: str | None,
    avatar_url: str | None,
    preferred_locale: str | None,
    preferred_currency: str | None,
) -> dict[str, Any] | None:
    current = get_user(session, user_id)
    if current is None:
        return None
    row = session.execute(
        text(
            """
            UPDATE users
            SET display_name = :display_name,
                avatar_url = :avatar_url,
                preferred_locale = :preferred_locale,
                preferred_currency = :preferred_currency,
                updated_at = now()
            WHERE id = :user_id AND deleted_at IS NULL
            RETURNING id, display_name, avatar_url, preferred_locale, preferred_currency,
                      risk_level, status
            """
        ),
        {
            "user_id": user_id,
            "display_name": display_name if display_name is not None else current["display_name"],
            "avatar_url": avatar_url if avatar_url is not None else current["avatar_url"],
            "preferred_locale": preferred_locale
            if preferred_locale is not None
            else current["preferred_locale"],
            "preferred_currency": preferred_currency
            if preferred_currency is not None
            else current["preferred_currency"],
        },
    ).first()
    return _dict(row) if row else None


def assign_role(
    session: Session,
    user_id: UUID,
    role_code: str,
    *,
    market_id: UUID | None = None,
    created_by: UUID | None = None,
) -> None:
    if market_id is None:
        session.execute(
            text(
                """
                INSERT INTO user_roles (user_id, role_id, scope_type, created_by)
                SELECT :user_id, r.id, 'global', :created_by
                FROM roles r
                WHERE r.code = :role_code
                  AND NOT EXISTS (
                      SELECT 1 FROM user_roles ur
                      WHERE ur.user_id = :user_id
                        AND ur.role_id = r.id
                        AND ur.deleted_at IS NULL
                        AND ur.scope_type = 'global'
                        AND ur.scope_id IS NULL
                  )
                """
            ),
            {"user_id": user_id, "role_code": role_code, "created_by": created_by},
        )
        return
    session.execute(
        text(
            """
            INSERT INTO user_roles (user_id, role_id, market_id, scope_type, scope_id, created_by)
            SELECT :user_id, r.id, :market_id, 'market', :market_id, :created_by
            FROM roles r
            WHERE r.code = :role_code
              AND NOT EXISTS (
                  SELECT 1 FROM user_roles ur
                  WHERE ur.user_id = :user_id
                    AND ur.role_id = r.id
                    AND ur.deleted_at IS NULL
                    AND ur.scope_type = 'market'
                    AND ur.scope_id = :market_id
              )
            """
        ),
        {
            "user_id": user_id,
            "role_code": role_code,
            "market_id": market_id,
            "created_by": created_by,
        },
    )


def create_role_profile(
    session: Session,
    user_id: UUID,
    role_code: str,
    *,
    market_id: UUID | None = None,
) -> None:
    if role_code not in {"traveler", "guide", "admin", "reviewer", "support"}:
        return
    if market_id is None:
        existing = session.execute(
            text(
                """
                SELECT id
                FROM user_role_profiles
                WHERE user_id = :user_id
                  AND role = :role
                  AND market_id IS NULL
                  AND deleted_at IS NULL
                LIMIT 1
                """
            ),
            {"user_id": user_id, "role": role_code},
        ).first()
        if existing is not None:
            session.execute(
                text(
                    """
                    UPDATE user_role_profiles
                    SET is_active = true,
                        onboarding_status = 'active',
                        updated_at = now()
                    WHERE id = :profile_id
                    """
                ),
                {"profile_id": existing[0]},
            )
            return
        session.execute(
            text(
                """
                INSERT INTO user_role_profiles (user_id, role, is_active, onboarding_status)
                VALUES (:user_id, :role, true, 'active')
                """
            ),
            {"user_id": user_id, "role": role_code},
        )
        return
    session.execute(
        text(
            """
            INSERT INTO user_role_profiles (user_id, role, market_id, is_active, onboarding_status)
            VALUES (:user_id, :role, :market_id, true, 'active')
            ON CONFLICT (user_id, role, market_id) DO UPDATE
            SET is_active = EXCLUDED.is_active,
                onboarding_status = EXCLUDED.onboarding_status,
                updated_at = now()
            """
        ),
        {"user_id": user_id, "role": role_code, "market_id": market_id},
    )


def switch_role_profile(
    session: Session,
    user_id: UUID,
    role_code: str,
    *,
    market_id: UUID | None = None,
) -> dict[str, Any]:
    assign_role(session, user_id, role_code, market_id=market_id)
    create_role_profile(session, user_id, role_code, market_id=market_id)
    session.execute(
        text(
            """
            UPDATE user_role_profiles
            SET is_active = false,
                updated_at = now()
            WHERE user_id = :user_id
              AND role IN ('traveler', 'guide')
              AND deleted_at IS NULL
            """
        ),
        {"user_id": user_id},
    )
    row = session.execute(
        text(
            """
            UPDATE user_role_profiles
            SET is_active = true,
                updated_at = now()
            WHERE user_id = :user_id
              AND role = :role
              AND market_id IS NULL
              AND deleted_at IS NULL
            RETURNING id, user_id, role, market_id, is_active, onboarding_status
            """
        )
        if market_id is None
        else text(
            """
            UPDATE user_role_profiles
            SET is_active = true,
                updated_at = now()
            WHERE user_id = :user_id
              AND role = :role
              AND market_id = :market_id
              AND deleted_at IS NULL
            RETURNING id, user_id, role, market_id, is_active, onboarding_status
            """
        ),
        {"user_id": user_id, "role": role_code, "market_id": market_id},
    ).first()
    if row is None:
        raise RuntimeError("Failed to switch role profile")
    return _dict(row)


def get_role(session: Session, role_code: str) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id, code, name
            FROM roles
            WHERE code = :role_code
            """
        ),
        {"role_code": role_code},
    ).first()
    return _dict(row) if row else None


def list_user_roles(session: Session, user_id: UUID) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT r.code, r.name, ur.market_id, ur.region_id, ur.scope_type, ur.scope_id
            FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = :user_id AND ur.deleted_at IS NULL
            ORDER BY r.code
            """
        ),
        {"user_id": user_id},
    )
    return [_dict(row) for row in rows]


def list_user_permissions(session: Session, user_id: UUID) -> list[str]:
    rows = session.execute(
        text(
            """
            SELECT DISTINCT p.code
            FROM user_roles ur
            JOIN role_permissions rp ON rp.role_id = ur.role_id
            JOIN permissions p ON p.id = rp.permission_id
            WHERE ur.user_id = :user_id AND ur.deleted_at IS NULL
            ORDER BY p.code
            """
        ),
        {"user_id": user_id},
    )
    return [row[0] for row in rows]


def create_refresh_token(
    session: Session,
    *,
    user_id: UUID,
    token_hash: str,
    expires_at: datetime,
) -> None:
    session.execute(
        text(
            """
            INSERT INTO auth_refresh_tokens (user_id, token_hash, expires_at)
            VALUES (:user_id, :token_hash, :expires_at)
            """
        ),
        {"user_id": user_id, "token_hash": token_hash, "expires_at": expires_at},
    )


def get_active_refresh_token(session: Session, token_hash: str) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id, user_id, expires_at
            FROM auth_refresh_tokens
            WHERE token_hash = :token_hash
              AND revoked_at IS NULL
              AND expires_at > now()
            """
        ),
        {"token_hash": token_hash},
    ).first()
    return _dict(row) if row else None


def revoke_refresh_token(session: Session, token_hash: str) -> None:
    session.execute(
        text(
            """
            UPDATE auth_refresh_tokens
            SET revoked_at = now()
            WHERE token_hash = :token_hash AND revoked_at IS NULL
            """
        ),
        {"token_hash": token_hash},
    )


def create_admin_invitation(
    session: Session,
    *,
    email: str,
    role_code: str,
    market_id: UUID | None,
    invitation_token_hash: str,
    expires_at: datetime,
    created_by: UUID,
) -> dict[str, Any]:
    row = session.execute(
        text(
            """
            INSERT INTO admin_invitations (
                email, role_code, market_id, invitation_token_hash, expires_at, created_by
            )
            VALUES (:email, :role_code, :market_id, :invitation_token_hash, :expires_at, :created_by)
            RETURNING id, email, role_code, market_id, status, expires_at, created_at
            """
        ),
        {
            "email": email.strip().lower(),
            "role_code": role_code,
            "market_id": market_id,
            "invitation_token_hash": invitation_token_hash,
            "expires_at": expires_at,
            "created_by": created_by,
        },
    ).first()
    if row is None:
        raise RuntimeError("Failed to create invitation")
    return _dict(row)


def get_pending_invitation(session: Session, invitation_token_hash: str) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id, email, role_code, market_id
            FROM admin_invitations
            WHERE invitation_token_hash = :invitation_token_hash
              AND status = 'pending'
              AND expires_at > now()
            """
        ),
        {"invitation_token_hash": invitation_token_hash},
    ).first()
    return _dict(row) if row else None


def mark_invitation_accepted(session: Session, invitation_id: UUID, user_id: UUID) -> None:
    session.execute(
        text(
            """
            UPDATE admin_invitations
            SET status = 'accepted',
                accepted_by = :user_id,
                accepted_at = now(),
                updated_at = now()
            WHERE id = :invitation_id
            """
        ),
        {"invitation_id": invitation_id, "user_id": user_id},
    )
