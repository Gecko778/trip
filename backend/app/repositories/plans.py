from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def _dict(row: Any) -> dict[str, Any]:
    return dict(row._mapping)


def create_travel_plan(
    session: Session,
    *,
    market_id: UUID,
    traveler_user_id: UUID,
    country_code: str,
    arrival_date: date,
    arrival_region_id: UUID | None,
    needs_pickup: bool,
    traveler_count: int,
    budget_min_amount: Decimal | None,
    budget_max_amount: Decimal | None,
    budget_currency: str | None,
    visibility: str,
    title: str | None,
    notes: str | None,
) -> dict[str, Any]:
    row = session.execute(
        text(
            """
            INSERT INTO travel_plans (
                market_id, traveler_user_id, country_code, arrival_date,
                arrival_region_id, needs_pickup, traveler_count,
                budget_min_amount, budget_max_amount, budget_currency,
                visibility, title, notes, created_by
            )
            VALUES (
                :market_id, :traveler_user_id, :country_code, :arrival_date,
                :arrival_region_id, :needs_pickup, :traveler_count,
                :budget_min_amount, :budget_max_amount, :budget_currency,
                CAST(:visibility AS visibility_enum), :title, :notes, :traveler_user_id
            )
            RETURNING id
            """
        ),
        {
            "market_id": market_id,
            "traveler_user_id": traveler_user_id,
            "country_code": country_code.upper(),
            "arrival_date": arrival_date,
            "arrival_region_id": arrival_region_id,
            "needs_pickup": needs_pickup,
            "traveler_count": traveler_count,
            "budget_min_amount": budget_min_amount,
            "budget_max_amount": budget_max_amount,
            "budget_currency": budget_currency.upper() if budget_currency else None,
            "visibility": visibility,
            "title": title,
            "notes": notes,
        },
    ).first()
    if row is None:
        raise RuntimeError("Failed to create travel plan")
    return get_travel_plan(session, row[0])


def list_market_travel_plans(
    session: Session,
    *,
    market_id: UUID,
    current_user_id: UUID,
    can_read_private: bool,
    status: str | None,
    region_id: UUID | None,
    limit: int,
    offset: int,
) -> list[dict[str, Any]]:
    conditions = [
        "tp.market_id = :market_id",
        "tp.deleted_at IS NULL",
    ]
    params: dict[str, Any] = {
        "market_id": market_id,
        "current_user_id": current_user_id,
        "limit": limit,
        "offset": offset,
    }
    if status is not None:
        conditions.append("tp.status = CAST(:status AS status_enum)")
        params["status"] = status
    if region_id is not None:
        conditions.append(
            """
            (
                tp.arrival_region_id = :region_id
                OR EXISTS (
                    SELECT 1
                    FROM itinerary_route_nodes rn
                    WHERE rn.travel_plan_id = tp.id
                      AND rn.region_id = :region_id
                )
            )
            """
        )
        params["region_id"] = region_id
    if not can_read_private:
        conditions.append(
            """
            (
                tp.visibility <> 'private'
                OR tp.traveler_user_id = :current_user_id
            )
            """
        )
    where_clause = " AND ".join(conditions)
    rows = session.execute(
        text(
            f"""
            SELECT id
            FROM travel_plans tp
            WHERE {where_clause}
            ORDER BY tp.created_at DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    )
    return [get_travel_plan(session, row[0]) for row in rows]


def get_travel_plan(session: Session, travel_plan_id: UUID) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id, market_id, traveler_user_id, country_code, arrival_date,
                   arrival_region_id, needs_pickup, traveler_count,
                   budget_min_amount, budget_max_amount, budget_currency,
                   visibility, status, title, notes, created_at, updated_at
            FROM travel_plans
            WHERE id = :travel_plan_id AND deleted_at IS NULL
            """
        ),
        {"travel_plan_id": travel_plan_id},
    ).first()
    if row is None:
        return None
    plan = _dict(row)
    plan["route_nodes"] = list_route_nodes(session, travel_plan_id)
    return plan


def update_travel_plan(
    session: Session,
    travel_plan_id: UUID,
    *,
    country_code: str | None,
    arrival_date: date | None,
    arrival_region_id: UUID | None,
    needs_pickup: bool | None,
    traveler_count: int | None,
    budget_min_amount: Decimal | None,
    budget_max_amount: Decimal | None,
    budget_currency: str | None,
    visibility: str | None,
    title: str | None,
    notes: str | None,
    updated_by: UUID,
) -> dict[str, Any] | None:
    current = get_travel_plan(session, travel_plan_id)
    if current is None:
        return None
    row = session.execute(
        text(
            """
            UPDATE travel_plans
            SET country_code = :country_code,
                arrival_date = :arrival_date,
                arrival_region_id = :arrival_region_id,
                needs_pickup = :needs_pickup,
                traveler_count = :traveler_count,
                budget_min_amount = :budget_min_amount,
                budget_max_amount = :budget_max_amount,
                budget_currency = :budget_currency,
                visibility = CAST(:visibility AS visibility_enum),
                title = :title,
                notes = :notes,
                updated_by = :updated_by,
                updated_at = now()
            WHERE id = :travel_plan_id AND deleted_at IS NULL
            RETURNING id
            """
        ),
        {
            "travel_plan_id": travel_plan_id,
            "country_code": country_code.upper() if country_code else current["country_code"],
            "arrival_date": arrival_date or current["arrival_date"],
            "arrival_region_id": arrival_region_id or current["arrival_region_id"],
            "needs_pickup": needs_pickup if needs_pickup is not None else current["needs_pickup"],
            "traveler_count": traveler_count or current["traveler_count"],
            "budget_min_amount": budget_min_amount
            if budget_min_amount is not None
            else current["budget_min_amount"],
            "budget_max_amount": budget_max_amount
            if budget_max_amount is not None
            else current["budget_max_amount"],
            "budget_currency": budget_currency.upper() if budget_currency else current["budget_currency"],
            "visibility": visibility or current["visibility"],
            "title": title if title is not None else current["title"],
            "notes": notes if notes is not None else current["notes"],
            "updated_by": updated_by,
        },
    ).first()
    return get_travel_plan(session, row[0]) if row else None


def set_travel_plan_status(
    session: Session,
    travel_plan_id: UUID,
    *,
    status: str,
    updated_by: UUID,
) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            UPDATE travel_plans
            SET status = CAST(:status AS status_enum),
                updated_by = :updated_by,
                updated_at = now()
            WHERE id = :travel_plan_id AND deleted_at IS NULL
            RETURNING id
            """
        ),
        {"travel_plan_id": travel_plan_id, "status": status, "updated_by": updated_by},
    ).first()
    return get_travel_plan(session, row[0]) if row else None


def list_route_nodes(session: Session, travel_plan_id: UUID) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id, travel_plan_id, region_id, sequence, planned_start_at,
                   planned_end_at, notes, created_at, updated_at
            FROM itinerary_route_nodes
            WHERE travel_plan_id = :travel_plan_id
            ORDER BY sequence
            """
        ),
        {"travel_plan_id": travel_plan_id},
    )
    return [_dict(row) for row in rows]


def get_route_node(session: Session, route_node_id: UUID) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id, travel_plan_id, region_id, sequence, planned_start_at,
                   planned_end_at, notes, created_at, updated_at
            FROM itinerary_route_nodes
            WHERE id = :route_node_id
            """
        ),
        {"route_node_id": route_node_id},
    ).first()
    return _dict(row) if row else None


def create_route_node(
    session: Session,
    *,
    travel_plan_id: UUID,
    region_id: UUID | None,
    sequence: int,
    planned_start_at: datetime | None,
    planned_end_at: datetime | None,
    notes: str | None,
) -> dict[str, Any]:
    row = session.execute(
        text(
            """
            INSERT INTO itinerary_route_nodes (
                travel_plan_id, region_id, sequence, planned_start_at, planned_end_at, notes
            )
            VALUES (
                :travel_plan_id, :region_id, :sequence,
                :planned_start_at, :planned_end_at, :notes
            )
            RETURNING id
            """
        ),
        {
            "travel_plan_id": travel_plan_id,
            "region_id": region_id,
            "sequence": sequence,
            "planned_start_at": planned_start_at,
            "planned_end_at": planned_end_at,
            "notes": notes,
        },
    ).first()
    if row is None:
        raise RuntimeError("Failed to create route node")
    return get_route_node(session, row[0])


def update_route_node(
    session: Session,
    route_node_id: UUID,
    *,
    region_id: UUID | None,
    sequence: int | None,
    planned_start_at: datetime | None,
    planned_end_at: datetime | None,
    notes: str | None,
) -> dict[str, Any] | None:
    current = get_route_node(session, route_node_id)
    if current is None:
        return None
    row = session.execute(
        text(
            """
            UPDATE itinerary_route_nodes
            SET region_id = :region_id,
                sequence = :sequence,
                planned_start_at = :planned_start_at,
                planned_end_at = :planned_end_at,
                notes = :notes,
                updated_at = now()
            WHERE id = :route_node_id
            RETURNING id
            """
        ),
        {
            "route_node_id": route_node_id,
            "region_id": region_id or current["region_id"],
            "sequence": sequence or current["sequence"],
            "planned_start_at": planned_start_at
            if planned_start_at is not None
            else current["planned_start_at"],
            "planned_end_at": planned_end_at
            if planned_end_at is not None
            else current["planned_end_at"],
            "notes": notes if notes is not None else current["notes"],
        },
    ).first()
    return get_route_node(session, row[0]) if row else None


def delete_route_node(session: Session, route_node_id: UUID) -> bool:
    result = session.execute(
        text("DELETE FROM itinerary_route_nodes WHERE id = :route_node_id"),
        {"route_node_id": route_node_id},
    )
    return result.rowcount > 0
