from uuid import UUID

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.permissions import require_permission
from app.core.responses import envelope
from app.db.deps import get_db_session
from app.repositories import markets as market_repository
from app.schemas.auth import MarketConfigUpdateRequest
from app.schemas.markets import RegionCreateRequest

router = APIRouter(prefix="/api/v1", tags=["markets"])


@router.get("/markets")
def list_markets(request: Request, session: Session = Depends(get_db_session)) -> dict:
    return envelope(
        data=market_repository.list_markets(session),
        trace_id=request.state.trace_id,
    )


@router.get("/markets/{market_id}")
def get_market(
    market_id: UUID,
    request: Request,
    session: Session = Depends(get_db_session),
) -> dict:
    market = market_repository.get_market(session, market_id)
    if market is None:
        raise HTTPException(status_code=404, detail="Market not found")
    return envelope(data=market, trace_id=request.state.trace_id)


@router.get("/markets/{market_id}/config")
def get_market_config(
    market_id: UUID,
    request: Request,
    session: Session = Depends(get_db_session),
) -> dict:
    config = market_repository.get_market_config(session, market_id)
    if config is None:
        raise HTTPException(status_code=404, detail="Market config not found")
    return envelope(data=config, trace_id=request.state.trace_id)


@router.patch("/markets/{market_id}/config")
def update_market_config(
    market_id: UUID,
    payload: MarketConfigUpdateRequest,
    request: Request,
    current_user: dict = Depends(require_permission("market.config:write")),
    session: Session = Depends(get_db_session),
) -> dict:
    if not _can_write_market_config(current_user, market_id):
        raise HTTPException(status_code=403, detail="Permission denied for market scope")
    config = market_repository.update_market_config(
        session,
        market_id,
        supported_locales=payload.supported_locales,
        supported_display_currencies=payload.supported_display_currencies,
        default_search_region_id=payload.default_search_region_id,
        config_json=payload.config_json,
    )
    if config is None:
        raise HTTPException(status_code=404, detail="Market config not found")
    session.commit()
    return envelope(data=config, trace_id=request.state.trace_id)


@router.get("/markets/{market_id}/regions")
def list_market_regions(
    market_id: UUID,
    request: Request,
    session: Session = Depends(get_db_session),
) -> dict:
    return envelope(
        data=market_repository.list_regions(session, market_id),
        trace_id=request.state.trace_id,
    )


@router.post("/markets/{market_id}/regions")
def create_market_region(
    market_id: UUID,
    payload: RegionCreateRequest,
    request: Request,
    current_user: dict = Depends(require_permission("market.config:write")),
    session: Session = Depends(get_db_session),
) -> dict:
    if not _can_write_market_config(current_user, market_id):
        raise HTTPException(status_code=403, detail="Permission denied for market scope")
    if market_repository.get_market(session, market_id) is None:
        raise HTTPException(status_code=404, detail="Market not found")
    try:
        region = market_repository.create_region(
            session,
            market_id,
            parent_id=payload.parent_id,
            region_type=payload.type,
            country_code=payload.country_code,
            code=payload.code,
            name=payload.name,
            localized_names=payload.localized_names,
            latitude=payload.latitude,
            longitude=payload.longitude,
            timezone=payload.timezone,
        )
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail="Region already exists or reference is invalid") from exc
    return envelope(data=region, trace_id=request.state.trace_id)


@router.get("/markets/{market_id}/regions/{region_id}")
def get_market_region(
    market_id: UUID,
    region_id: UUID,
    request: Request,
    session: Session = Depends(get_db_session),
) -> dict:
    region = market_repository.get_region(session, market_id, region_id)
    if region is None:
        raise HTTPException(status_code=404, detail="Region not found")
    return envelope(data=region, trace_id=request.state.trace_id)


@router.get("/markets/{market_id}/payment-methods")
def list_market_payment_methods(
    market_id: UUID,
    request: Request,
    session: Session = Depends(get_db_session),
) -> dict:
    return envelope(
        data=market_repository.list_market_payment_methods(session, market_id),
        trace_id=request.state.trace_id,
    )


@router.get("/markets/{market_id}/currencies")
def list_market_currencies(
    market_id: UUID,
    request: Request,
    session: Session = Depends(get_db_session),
) -> dict:
    # Currencies are global reference data in Milestone 2.
    return envelope(
        data=market_repository.list_currencies(session),
        trace_id=request.state.trace_id,
    )


@router.get("/markets/{market_id}/exchange-rates/quote")
def get_exchange_rate_quote(
    market_id: UUID,
    request: Request,
    source_currency: str = Query(min_length=3, max_length=3),
    target_currency: str = Query(min_length=3, max_length=3),
    amount: Decimal = Query(default=Decimal("1"), gt=0),
    session: Session = Depends(get_db_session),
) -> dict:
    if market_repository.get_market(session, market_id) is None:
        raise HTTPException(status_code=404, detail="Market not found")
    quote = market_repository.get_exchange_rate_quote(
        session,
        source_currency=source_currency.upper(),
        target_currency=target_currency.upper(),
        amount=amount,
    )
    if quote is None:
        raise HTTPException(status_code=404, detail="Exchange rate not found")
    return envelope(data=quote, trace_id=request.state.trace_id)


def _can_write_market_config(current_user: dict, market_id: UUID) -> bool:
    for role in current_user["roles"]:
        if role["code"] == "sys_admin" and role["scope_type"] == "global":
            return True
        if role["code"] == "market_admin" and (
            role["scope_type"] == "global"
            or role["market_id"] == market_id
            or role["scope_id"] == market_id
        ):
            return True
    return False
