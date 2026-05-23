import json
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def _dict(row: Any) -> dict[str, Any]:
    return dict(row._mapping)


def list_markets(session: Session) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id, code, name, status, default_country_code, default_locale,
                   default_currency, timezone
            FROM markets
            WHERE deleted_at IS NULL
            ORDER BY code
            """
        )
    )
    return [_dict(row) for row in rows]


def get_market(session: Session, market_id: UUID) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id, code, name, status, default_country_code, default_locale,
                   default_currency, timezone
            FROM markets
            WHERE id = :market_id AND deleted_at IS NULL
            """
        ),
        {"market_id": market_id},
    ).first()
    return _dict(row) if row else None


def get_market_config(session: Session, market_id: UUID) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT market_id, supported_locales, supported_display_currencies,
                   default_search_region_id, config_json
            FROM market_configs
            WHERE market_id = :market_id AND deleted_at IS NULL
            """
        ),
        {"market_id": market_id},
    ).first()
    return _dict(row) if row else None


def update_market_config(
    session: Session,
    market_id: UUID,
    *,
    supported_locales: list[str] | None,
    supported_display_currencies: list[str] | None,
    default_search_region_id: UUID | None,
    config_json: dict[str, Any] | None,
) -> dict[str, Any] | None:
    current = get_market_config(session, market_id)
    if current is None:
        return None
    row = session.execute(
        text(
            """
            UPDATE market_configs
            SET supported_locales = :supported_locales,
                supported_display_currencies = :supported_display_currencies,
                default_search_region_id = :default_search_region_id,
                config_json = CAST(:config_json AS jsonb),
                updated_at = now()
            WHERE market_id = :market_id AND deleted_at IS NULL
            RETURNING market_id, supported_locales, supported_display_currencies,
                      default_search_region_id, config_json
            """
        ),
        {
            "market_id": market_id,
            "supported_locales": supported_locales
            if supported_locales is not None
            else current["supported_locales"],
            "supported_display_currencies": supported_display_currencies
            if supported_display_currencies is not None
            else current["supported_display_currencies"],
            "default_search_region_id": default_search_region_id
            if default_search_region_id is not None
            else current["default_search_region_id"],
            "config_json": json.dumps(config_json if config_json is not None else current["config_json"]),
        },
    ).first()
    return _dict(row) if row else None


def list_regions(session: Session, market_id: UUID) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id, market_id, parent_id, type, country_code, code, name,
                   localized_names, latitude, longitude, timezone, status
            FROM regions
            WHERE market_id = :market_id AND deleted_at IS NULL
            ORDER BY type, name
            """
        ),
        {"market_id": market_id},
    )
    return [_dict(row) for row in rows]


def get_region(session: Session, market_id: UUID, region_id: UUID) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id, market_id, parent_id, type, country_code, code, name,
                   localized_names, latitude, longitude, timezone, status
            FROM regions
            WHERE id = :region_id
              AND market_id = :market_id
              AND deleted_at IS NULL
            """
        ),
        {"market_id": market_id, "region_id": region_id},
    ).first()
    return _dict(row) if row else None


def create_region(
    session: Session,
    market_id: UUID,
    *,
    parent_id: UUID | None,
    region_type: str,
    country_code: str,
    code: str,
    name: str,
    localized_names: dict[str, Any],
    latitude: Decimal | None,
    longitude: Decimal | None,
    timezone: str | None,
) -> dict[str, Any]:
    row = session.execute(
        text(
            """
            INSERT INTO regions (
                market_id, parent_id, type, country_code, code, name,
                localized_names, latitude, longitude, timezone, status
            )
            VALUES (
                :market_id, :parent_id, :type, :country_code, :code, :name,
                CAST(:localized_names AS jsonb), :latitude, :longitude, :timezone, 'active'
            )
            RETURNING id, market_id, parent_id, type, country_code, code, name,
                      localized_names, latitude, longitude, timezone, status
            """
        ),
        {
            "market_id": market_id,
            "parent_id": parent_id,
            "type": region_type,
            "country_code": country_code.upper(),
            "code": code.strip(),
            "name": name.strip(),
            "localized_names": json.dumps(localized_names),
            "latitude": latitude,
            "longitude": longitude,
            "timezone": timezone,
        },
    ).first()
    if row is None:
        raise RuntimeError("Failed to create region")
    return _dict(row)


def get_exchange_rate_quote(
    session: Session,
    *,
    source_currency: str,
    target_currency: str,
    amount: Decimal,
) -> dict[str, Any] | None:
    if source_currency == target_currency:
        return {
            "source_currency": source_currency,
            "target_currency": target_currency,
            "rate": Decimal("1"),
            "amount": amount,
            "converted_amount": amount,
            "provider": "identity",
            "observed_at": None,
        }
    row = session.execute(
        text(
            """
            SELECT source_currency, target_currency, rate, provider, observed_at
            FROM exchange_rates
            WHERE source_currency = :source_currency
              AND target_currency = :target_currency
            ORDER BY observed_at DESC
            LIMIT 1
            """
        ),
        {
            "source_currency": source_currency.upper(),
            "target_currency": target_currency.upper(),
        },
    ).first()
    if row is None:
        return None
    quote = _dict(row)
    quote["amount"] = amount
    quote["converted_amount"] = amount * quote["rate"]
    return quote


def list_market_payment_methods(session: Session, market_id: UUID) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id, market_id, method_code, provider_code,
                   supported_country_codes, supported_currencies,
                   applies_to_user_roles, applies_to_side, fee_rule_json,
                   settlement_cycle, is_enabled
            FROM payment_method_configs
            WHERE market_id = :market_id AND deleted_at IS NULL
            ORDER BY method_code, provider_code
            """
        ),
        {"market_id": market_id},
    )
    return [_dict(row) for row in rows]


def list_currencies(session: Session) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT code, name, symbol, decimal_places
            FROM currencies
            ORDER BY code
            """
        )
    )
    return [_dict(row) for row in rows]
