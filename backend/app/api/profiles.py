from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.permissions import get_current_user, require_permission
from app.core.responses import envelope
from app.db.deps import get_db_session
from app.repositories import auth as auth_repository
from app.repositories import markets as market_repository
from app.repositories import profiles as profile_repository
from app.schemas.profiles import (
    GuideProfileCreateRequest,
    GuideProfileUpdateRequest,
    GuideVerificationReviewRequest,
    OnboardingUpdateRequest,
    TravelerProfileCreateRequest,
    TravelerProfileUpdateRequest,
)

router = APIRouter(prefix="/api/v1", tags=["profiles"])


@router.get("/me/profiles")
def list_my_profiles(
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    return envelope(data=_my_profiles(session, current_user["id"]), trace_id=request.state.trace_id)


@router.get("/me/onboarding")
def get_my_onboarding(
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    return envelope(
        data={"role_profiles": profile_repository.list_role_profiles(session, current_user["id"])},
        trace_id=request.state.trace_id,
    )


@router.patch("/me/onboarding")
def update_my_onboarding(
    payload: OnboardingUpdateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    profile = profile_repository.update_onboarding_status(
        session,
        current_user["id"],
        role=payload.role,
        status=payload.status,
        market_id=payload.market_id,
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="Role profile not found")
    session.commit()
    return envelope(data=profile, trace_id=request.state.trace_id)


@router.post("/me/traveler-profile")
def create_my_traveler_profile(
    payload: TravelerProfileCreateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    try:
        auth_repository.assign_role(session, current_user["id"], "traveler", market_id=payload.market_id)
        auth_repository.create_role_profile(
            session,
            current_user["id"],
            "traveler",
            market_id=payload.market_id,
        )
        profile = profile_repository.create_traveler_profile(
            session,
            user_id=current_user["id"],
            market_id=payload.market_id,
            preference_json=payload.preference_json,
        )
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail="Invalid traveler profile reference") from exc
    return envelope(data=profile, trace_id=request.state.trace_id)


@router.get("/travelers/{traveler_profile_id}")
def get_traveler_profile(
    traveler_profile_id: UUID,
    request: Request,
    _current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    profile = profile_repository.get_traveler_profile(session, traveler_profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Traveler profile not found")
    return envelope(data=profile, trace_id=request.state.trace_id)


@router.patch("/travelers/{traveler_profile_id}")
def update_traveler_profile(
    traveler_profile_id: UUID,
    payload: TravelerProfileUpdateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    existing = profile_repository.get_traveler_profile(session, traveler_profile_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Traveler profile not found")
    _ensure_owner_or_user_write(current_user, existing["user_id"])
    profile = profile_repository.update_traveler_profile(
        session,
        traveler_profile_id,
        preference_json=payload.preference_json,
    )
    session.commit()
    return envelope(data=profile, trace_id=request.state.trace_id)


@router.post("/me/guide-profile")
def create_my_guide_profile(
    payload: GuideProfileCreateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    try:
        auth_repository.assign_role(session, current_user["id"], "guide", market_id=payload.market_id)
        auth_repository.create_role_profile(
            session,
            current_user["id"],
            "guide",
            market_id=payload.market_id,
        )
        profile = profile_repository.create_guide_profile(
            session,
            user_id=current_user["id"],
            market_id=payload.market_id,
            country_code=payload.country_code,
            home_region_id=payload.home_region_id,
            daily_price_amount=payload.daily_price_amount,
            quote_currency=payload.quote_currency,
            offers_pickup=payload.offers_pickup,
            gender=payload.gender,
            birth_year=payload.birth_year,
            language_tags=payload.language_tags,
            service_region_ids=payload.service_region_ids,
            service_scope_modes=payload.service_scope_modes,
        )
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail="Invalid guide profile reference") from exc
    return envelope(data=profile, trace_id=request.state.trace_id)


@router.get("/markets/{market_id}/guides")
def list_market_guides(
    market_id: UUID,
    request: Request,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    if market_repository.get_market(session, market_id) is None:
        raise HTTPException(status_code=404, detail="Market not found")
    guides = profile_repository.list_market_guide_profiles(
        session,
        market_id=market_id,
        limit=limit,
        offset=offset,
    )
    return envelope(
        data=guides,
        meta={"limit": limit, "offset": offset},
        trace_id=request.state.trace_id,
    )


@router.get("/guides/{guide_profile_id}")
def get_guide_profile(
    guide_profile_id: UUID,
    request: Request,
    _current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    profile = profile_repository.get_guide_profile(session, guide_profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Guide profile not found")
    return envelope(data=profile, trace_id=request.state.trace_id)


@router.patch("/guides/{guide_profile_id}")
def update_guide_profile(
    guide_profile_id: UUID,
    payload: GuideProfileUpdateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    existing = profile_repository.get_guide_profile(session, guide_profile_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Guide profile not found")
    _ensure_owner_or_user_write(current_user, existing["user_id"])
    try:
        profile = profile_repository.update_guide_profile(
            session,
            guide_profile_id,
            home_region_id=payload.home_region_id,
            daily_price_amount=payload.daily_price_amount,
            quote_currency=payload.quote_currency,
            offers_pickup=payload.offers_pickup,
            gender=payload.gender,
            birth_year=payload.birth_year,
            language_tags=payload.language_tags,
            service_region_ids=payload.service_region_ids,
            service_scope_modes=payload.service_scope_modes,
        )
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail="Invalid guide profile reference") from exc
    return envelope(data=profile, trace_id=request.state.trace_id)


@router.post("/guides/{guide_profile_id}/verification")
def submit_guide_verification(
    guide_profile_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    existing = profile_repository.get_guide_profile(session, guide_profile_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Guide profile not found")
    _ensure_owner_or_user_write(current_user, existing["user_id"])
    verification = profile_repository.submit_guide_verification(
        session,
        guide_profile_id,
        user_id=current_user["id"],
    )
    session.commit()
    return envelope(data=verification, trace_id=request.state.trace_id)


@router.get("/guides/{guide_profile_id}/verification")
def get_guide_verification(
    guide_profile_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    existing = profile_repository.get_guide_profile(session, guide_profile_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Guide profile not found")
    _ensure_owner_or_user_read(current_user, existing["user_id"])
    verification = profile_repository.get_guide_verification_by_profile(session, guide_profile_id)
    if verification is None:
        raise HTTPException(status_code=404, detail="Guide verification not found")
    return envelope(data=verification, trace_id=request.state.trace_id)


@router.get("/admin/markets/{market_id}/guide-verifications")
def list_market_guide_verifications(
    market_id: UUID,
    request: Request,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(require_permission("guide.verification:review")),
    session: Session = Depends(get_db_session),
) -> dict:
    if market_repository.get_market(session, market_id) is None:
        raise HTTPException(status_code=404, detail="Market not found")
    if not _can_review_market(current_user, market_id):
        raise HTTPException(status_code=403, detail="Cannot review this market")
    verifications = profile_repository.list_market_guide_verifications(
        session,
        market_id=market_id,
        limit=limit,
        offset=offset,
    )
    return envelope(
        data=verifications,
        meta={"limit": limit, "offset": offset},
        trace_id=request.state.trace_id,
    )


@router.patch("/guides/{guide_profile_id}/verification/{verification_id}")
def review_guide_verification(
    guide_profile_id: UUID,
    verification_id: UUID,
    payload: GuideVerificationReviewRequest,
    request: Request,
    current_user: dict = Depends(require_permission("guide.verification:review")),
    session: Session = Depends(get_db_session),
) -> dict:
    existing = profile_repository.get_guide_profile(session, guide_profile_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Guide profile not found")
    verification = profile_repository.get_guide_verification(session, verification_id)
    if verification is None or verification["guide_profile_id"] != guide_profile_id:
        raise HTTPException(status_code=404, detail="Guide verification not found")
    if not _can_review_market(current_user, verification["market_id"]):
        raise HTTPException(status_code=403, detail="Permission denied for market scope")
    reviewed = profile_repository.review_guide_verification(
        session,
        verification_id,
        reviewer_user_id=current_user["id"],
        status=payload.status,
        failure_reason=payload.failure_reason,
    )
    session.commit()
    return envelope(data=reviewed, trace_id=request.state.trace_id)


def _my_profiles(session: Session, user_id: UUID) -> dict:
    return {
        "role_profiles": profile_repository.list_role_profiles(session, user_id),
        "traveler_profiles": profile_repository.list_traveler_profiles(session, user_id),
        "guide_profiles": profile_repository.list_guide_profiles(session, user_id),
    }


def _ensure_owner_or_user_write(current_user: dict, owner_user_id: UUID) -> None:
    if current_user["id"] == owner_user_id:
        return
    if "user:write" in current_user["permissions"]:
        return
    raise HTTPException(status_code=403, detail="Permission denied")


def _ensure_owner_or_user_read(current_user: dict, owner_user_id: UUID) -> None:
    if current_user["id"] == owner_user_id:
        return
    if "user:read" in current_user["permissions"]:
        return
    raise HTTPException(status_code=403, detail="Permission denied")


def _can_review_market(current_user: dict, market_id: UUID) -> bool:
    for role in current_user["roles"]:
        if role["code"] == "sys_admin" and role["scope_type"] == "global":
            return True
        if role["code"] in {"market_admin", "guide_reviewer"} and (
            role["scope_type"] == "global"
            or role["market_id"] == market_id
            or role["scope_id"] == market_id
        ):
            return True
    return False
