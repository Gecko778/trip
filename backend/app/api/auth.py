from datetime import UTC, datetime, timedelta
from secrets import token_urlsafe
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions import get_current_user, require_permission
from app.core.responses import envelope
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.db.deps import get_db_session
from app.repositories import auth as auth_repository
from app.schemas.auth import (
    AdminInvitationAcceptRequest,
    AdminInvitationCreateRequest,
    LoginRequest,
    LogoutRequest,
    OAuthLoginRequest,
    RefreshRequest,
    RegisterRequest,
)

router = APIRouter(prefix="/api/v1", tags=["auth"])

INVITABLE_ADMIN_ROLES = {
    "market_admin": "admin",
    "guide_reviewer": "reviewer",
    "content_reviewer": "reviewer",
    "risk_reviewer": "reviewer",
    "support_agent": "support",
}


@router.post("/auth/register")
def register_user(
    payload: RegisterRequest,
    request: Request,
    session: Session = Depends(get_db_session),
) -> dict:
    try:
        user = auth_repository.create_user_with_password_identity(
            session,
            provider=payload.provider,
            identifier=payload.identifier,
            password_hash=hash_password(payload.password),
            display_name=payload.display_name,
            preferred_locale=payload.preferred_locale,
            preferred_currency=payload.preferred_currency,
        )
        access_token, refresh_token = _issue_token_pair(session, user["id"])
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail="Auth identity already exists") from exc
    return envelope(
        data={"user": _user_response(session, user["id"]), "tokens": _token_response(access_token, refresh_token)},
        trace_id=request.state.trace_id,
    )


@router.post("/auth/login")
def login(
    payload: LoginRequest,
    request: Request,
    session: Session = Depends(get_db_session),
) -> dict:
    identity = auth_repository.get_identity_for_login(session, payload.provider, payload.identifier)
    if identity is None or identity["password_hash"] is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(payload.password, identity["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if identity["status"] != "active":
        raise HTTPException(status_code=401, detail="Inactive user")
    access_token, refresh_token = _issue_token_pair(session, identity["user_id"])
    session.commit()
    return envelope(
        data={"user": _user_response(session, identity["user_id"]), "tokens": _token_response(access_token, refresh_token)},
        trace_id=request.state.trace_id,
    )


@router.post("/auth/oauth/login")
def oauth_login(payload: OAuthLoginRequest) -> None:
    _ensure_oauth_config(payload.provider)
    raise HTTPException(
        status_code=501,
        detail=f"{payload.provider} login requires provider token verification configuration",
    )


@router.post("/auth/refresh")
def refresh_token(
    payload: RefreshRequest,
    request: Request,
    session: Session = Depends(get_db_session),
) -> dict:
    token_payload = decode_token(payload.refresh_token, expected_type="refresh")
    if token_payload is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    stored_token = auth_repository.get_active_refresh_token(session, hash_token(payload.refresh_token))
    if stored_token is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = auth_repository.get_user(session, UUID(token_payload["sub"]))
    if user is None or user["id"] != stored_token["user_id"] or user["status"] != "active":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    access_token = create_access_token(user["id"])
    return envelope(
        data={"access_token": access_token, "token_type": "bearer"},
        trace_id=request.state.trace_id,
    )


@router.post("/auth/logout")
def logout(
    payload: LogoutRequest,
    request: Request,
    session: Session = Depends(get_db_session),
) -> dict:
    auth_repository.revoke_refresh_token(session, hash_token(payload.refresh_token))
    session.commit()
    return envelope(data={"logged_out": True}, trace_id=request.state.trace_id)


@router.get("/auth/me")
def get_me(request: Request, current_user: dict = Depends(get_current_user)) -> dict:
    return envelope(data=current_user, trace_id=request.state.trace_id)


@router.post("/admin/invitations")
def create_admin_invitation(
    payload: AdminInvitationCreateRequest,
    request: Request,
    current_user: dict = Depends(require_permission("admin.invitation:create")),
    session: Session = Depends(get_db_session),
) -> dict:
    if payload.role_code not in INVITABLE_ADMIN_ROLES:
        raise HTTPException(status_code=400, detail="Role is not invitable")
    invitation_token = token_urlsafe(32)
    invitation = auth_repository.create_admin_invitation(
        session,
        email=payload.email,
        role_code=payload.role_code,
        market_id=payload.market_id,
        invitation_token_hash=hash_token(invitation_token),
        expires_at=datetime.now(UTC) + timedelta(days=payload.expires_in_days),
        created_by=current_user["id"],
    )
    session.commit()
    invitation["invitation_token"] = invitation_token
    return envelope(data=invitation, trace_id=request.state.trace_id)


@router.post("/admin/invitations/accept")
def accept_admin_invitation(
    payload: AdminInvitationAcceptRequest,
    request: Request,
    session: Session = Depends(get_db_session),
) -> dict:
    invitation = auth_repository.get_pending_invitation(session, hash_token(payload.invitation_token))
    if invitation is None:
        raise HTTPException(status_code=404, detail="Invitation not found")
    role_profile = INVITABLE_ADMIN_ROLES[invitation["role_code"]]
    try:
        user = auth_repository.create_user_with_password_identity(
            session,
            provider="email",
            identifier=invitation["email"],
            password_hash=hash_password(payload.password),
            display_name=payload.display_name,
            preferred_locale=payload.preferred_locale,
            preferred_currency=payload.preferred_currency,
            default_role_code=invitation["role_code"],
            market_id=invitation["market_id"],
        )
        auth_repository.create_role_profile(
            session,
            user["id"],
            role_profile,
            market_id=invitation["market_id"],
        )
        auth_repository.mark_invitation_accepted(session, invitation["id"], user["id"])
        access_token, refresh_token = _issue_token_pair(session, user["id"])
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail="Auth identity already exists") from exc
    return envelope(
        data={"user": _user_response(session, user["id"]), "tokens": _token_response(access_token, refresh_token)},
        trace_id=request.state.trace_id,
    )


def _issue_token_pair(session: Session, user_id: UUID) -> tuple[str, str]:
    access_token = create_access_token(user_id)
    refresh_token, refresh_expires_at = create_refresh_token(user_id)
    auth_repository.create_refresh_token(
        session,
        user_id=user_id,
        token_hash=hash_token(refresh_token),
        expires_at=refresh_expires_at,
    )
    return access_token, refresh_token


def _token_response(access_token: str, refresh_token: str) -> dict:
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


def _user_response(session: Session, user_id: UUID) -> dict:
    user = auth_repository.get_user(session, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user["roles"] = auth_repository.list_user_roles(session, user_id)
    user["permissions"] = auth_repository.list_user_permissions(session, user_id)
    return user


def _ensure_oauth_config(provider: str) -> None:
    message = "未填写Google/Apple Id, bundle id，到 /Users/gecko/trip/.env 内填写完整id"
    if provider == "google" and not settings.google_oauth_client_id:
        raise HTTPException(status_code=500, detail=message)
    if provider == "apple" and (
        not settings.apple_oauth_client_id or not settings.apple_oauth_bundle_id
    ):
        raise HTTPException(status_code=500, detail=message)
