from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.permissions import get_current_user, require_permission
from app.core.responses import envelope
from app.db.deps import get_db_session
from app.repositories import auth as auth_repository
from app.repositories import profiles as profile_repository
from app.schemas.auth import RoleSwitchRequest, UserRoleAssignRequest, UserUpdateRequest

router = APIRouter(prefix="/api/v1", tags=["users"])


@router.post("/me/role-switch")
def switch_my_role(
    payload: RoleSwitchRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    profile = auth_repository.switch_role_profile(
        session,
        current_user["id"],
        payload.role,
        market_id=payload.market_id,
    )
    session.commit()
    return envelope(
        data={"active_profile": profile, "user": _user_response(session, current_user["id"])},
        trace_id=request.state.trace_id,
    )


@router.get("/users")
def list_users(
    request: Request,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _current_user: dict = Depends(require_permission("user:read")),
    session: Session = Depends(get_db_session),
) -> dict:
    return envelope(
        data=auth_repository.list_users(session, limit=limit, offset=offset),
        meta={"limit": limit, "offset": offset},
        trace_id=request.state.trace_id,
    )


@router.get("/users/{user_id}/public-profile")
def get_public_user_profile(
    user_id: UUID,
    request: Request,
    _current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    user = auth_repository.get_user(session, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return envelope(
        data={
            "user": user,
            "roles": auth_repository.list_user_roles(session, user_id),
            "traveler_profiles": profile_repository.list_traveler_profiles(session, user_id),
            "guide_profiles": profile_repository.list_guide_profiles(session, user_id),
        },
        trace_id=request.state.trace_id,
    )


@router.get("/users/{user_id}")
def get_user(
    user_id: UUID,
    request: Request,
    _current_user: dict = Depends(require_permission("user:read")),
    session: Session = Depends(get_db_session),
) -> dict:
    user = _user_response(session, user_id)
    return envelope(data=user, trace_id=request.state.trace_id)


@router.patch("/users/{user_id}")
def update_user(
    user_id: UUID,
    payload: UserUpdateRequest,
    request: Request,
    _current_user: dict = Depends(require_permission("user:write")),
    session: Session = Depends(get_db_session),
) -> dict:
    try:
        user = auth_repository.update_user(
            session,
            user_id,
            display_name=payload.display_name,
            avatar_url=payload.avatar_url,
            preferred_locale=payload.preferred_locale,
            preferred_currency=payload.preferred_currency,
        )
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail="Invalid user preference reference") from exc
    user["roles"] = auth_repository.list_user_roles(session, user_id)
    user["permissions"] = auth_repository.list_user_permissions(session, user_id)
    return envelope(data=user, trace_id=request.state.trace_id)


@router.post("/users/{user_id}/roles")
def assign_user_role(
    user_id: UUID,
    payload: UserRoleAssignRequest,
    request: Request,
    current_user: dict = Depends(require_permission("user:write")),
    session: Session = Depends(get_db_session),
) -> dict:
    if auth_repository.get_user(session, user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")
    if auth_repository.get_role(session, payload.role_code) is None:
        raise HTTPException(status_code=404, detail="Role not found")
    auth_repository.assign_role(
        session,
        user_id,
        payload.role_code,
        market_id=payload.market_id,
        created_by=current_user["id"],
    )
    auth_repository.create_role_profile(session, user_id, payload.role_code, market_id=payload.market_id)
    session.commit()
    return envelope(data=_user_response(session, user_id), trace_id=request.state.trace_id)


def _user_response(session: Session, user_id: UUID) -> dict:
    user = auth_repository.get_user(session, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user["roles"] = auth_repository.list_user_roles(session, user_id)
    user["permissions"] = auth_repository.list_user_permissions(session, user_id)
    return user
