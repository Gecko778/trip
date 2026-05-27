from datetime import date
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def _dict(row: Any) -> dict[str, Any]:
    return dict(row._mapping)


def list_map_routes(
    session: Session,
    *,
    market_id: UUID,
    user_id: UUID,
    role: str,
    status: str | None,
) -> list[dict[str, Any]]:
    if role not in {"traveler", "guide"}:
        return []
    status_clause = ""
    params: dict[str, Any] = {"market_id": market_id, "user_id": user_id, "role": role}
    if status is not None:
        status_clause = "AND so.status = CAST(:status AS order_status_enum)"
        params["status"] = status
    participant_clause = "so.traveler_user_id = :user_id" if role == "traveler" else "so.guide_user_id = :user_id"
    rows = session.execute(
        text(
            f"""
            SELECT so.id, so.market_id, so.traveler_user_id, so.guide_user_id,
                   so.travel_plan_id, so.status, so.payment_status,
                   so.service_start_date, so.service_end_date, so.service_region_id,
                   so.traveler_count, so.guide_price_amount, so.guide_price_currency,
                   sr.name AS service_region_name,
                   sr.latitude AS service_latitude,
                   sr.longitude AS service_longitude,
                   traveler.display_name AS traveler_display_name,
                   traveler.avatar_url AS traveler_avatar_url,
                   guide.display_name AS guide_display_name,
                   guide.avatar_url AS guide_avatar_url
            FROM service_orders so
            LEFT JOIN regions sr ON sr.id = so.service_region_id
            JOIN users traveler ON traveler.id = so.traveler_user_id
            JOIN users guide ON guide.id = so.guide_user_id
            WHERE so.market_id = :market_id
              AND so.deleted_at IS NULL
              AND {participant_clause}
              {status_clause}
            ORDER BY so.service_start_date NULLS LAST, so.created_at DESC
            """
        ),
        params,
    )
    routes = []
    for row in rows:
        route = _dict(row)
        route["viewer_role"] = role
        route["route_status"] = _route_status(route["status"], route["service_start_date"], route["service_end_date"])
        route["points"] = _order_route_points(session, route)
        routes.append(route)
    return routes


def list_calendar_events(
    session: Session,
    *,
    market_id: UUID,
    user_id: UUID,
    role: str,
) -> list[dict[str, Any]]:
    if role == "traveler":
        return _traveler_calendar_events(session, market_id=market_id, user_id=user_id)
    if role == "guide":
        return _guide_calendar_events(session, market_id=market_id, user_id=user_id)
    return []


def list_travel_plan_leads_for_guide(
    session: Session,
    *,
    market_id: UUID,
    guide_user_id: UUID,
    limit: int,
    offset: int,
) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            WITH guide_profile AS (
                SELECT id, service_scope_modes
                FROM guide_profiles
                WHERE market_id = :market_id
                  AND user_id = :guide_user_id
                  AND deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT 1
            ),
            guide_regions AS (
                SELECT gsr.region_id
                FROM guide_profile gp
                JOIN guide_service_regions gsr ON gsr.guide_profile_id = gp.id
                UNION
                SELECT gp.home_region_id
                FROM guide_profiles gp
                WHERE gp.id = (SELECT id FROM guide_profile)
            ),
            guide_windows AS (
                SELECT region_id, available_start_date, available_end_date
                FROM guide_availability_windows
                WHERE market_id = :market_id
                  AND guide_user_id = :guide_user_id
                  AND status = 'available'
                  AND deleted_at IS NULL
            )
            SELECT tp.id AS travel_plan_id,
                   tp.market_id,
                   tp.traveler_user_id,
                   u.display_name AS traveler_display_name,
                   u.avatar_url AS traveler_avatar_url,
                   rn.region_id AS lead_region_id,
                   r.name AS lead_region_name,
                   r.latitude,
                   r.longitude,
                   COALESCE(rn.planned_start_at::date, tp.arrival_date) AS lead_start_date,
                   COALESCE(rn.planned_end_at::date, rn.planned_start_at::date, tp.arrival_date) AS lead_end_date,
                   tp.needs_pickup,
                   tp.traveler_count,
                   tp.budget_min_amount,
                   tp.budget_max_amount,
                   tp.budget_currency,
                   tp.looking_for_partner,
                   tp.guide_hiring_mode,
                   CASE
                     WHEN tp.guide_hiring_mode = 'full_route' THEN 'full_route'
                     ELSE 'point_to_point'
                   END AS service_match_scope
            FROM travel_plans tp
            JOIN itinerary_route_nodes rn ON rn.travel_plan_id = tp.id
            JOIN regions r ON r.id = rn.region_id
            JOIN users u ON u.id = tp.traveler_user_id
            CROSS JOIN guide_profile gp
            WHERE tp.market_id = :market_id
              AND tp.deleted_at IS NULL
              AND tp.status = 'active'
              AND tp.traveler_user_id <> :guide_user_id
              AND (
                  (
                    tp.guide_hiring_mode = 'point_to_point'
                    AND 'point_to_point' = ANY(gp.service_scope_modes)
                    AND rn.region_id IN (SELECT region_id FROM guide_regions)
                    AND EXISTS (
                        SELECT 1
                        FROM guide_windows gw
                        WHERE (gw.region_id IS NULL OR gw.region_id = rn.region_id)
                          AND gw.available_start_date <= COALESCE(rn.planned_end_at::date, rn.planned_start_at::date, tp.arrival_date)
                          AND gw.available_end_date >= COALESCE(rn.planned_start_at::date, tp.arrival_date)
                    )
                  )
                  OR
                  (
                    tp.guide_hiring_mode = 'full_route'
                    AND 'full_route' = ANY(gp.service_scope_modes)
                    AND rn.sequence = (
                        SELECT MIN(first_node.sequence)
                        FROM itinerary_route_nodes first_node
                        WHERE first_node.travel_plan_id = tp.id
                    )
                    AND NOT EXISTS (
                        SELECT 1
                        FROM itinerary_route_nodes missing_region
                        WHERE missing_region.travel_plan_id = tp.id
                          AND missing_region.region_id NOT IN (SELECT region_id FROM guide_regions)
                    )
                    AND NOT EXISTS (
                        SELECT 1
                        FROM itinerary_route_nodes uncovered_node
                        WHERE uncovered_node.travel_plan_id = tp.id
                          AND NOT EXISTS (
                              SELECT 1
                              FROM guide_windows gw
                              WHERE (gw.region_id IS NULL OR gw.region_id = uncovered_node.region_id)
                                AND gw.available_start_date <= COALESCE(uncovered_node.planned_end_at::date, uncovered_node.planned_start_at::date, tp.arrival_date)
                                AND gw.available_end_date >= COALESCE(uncovered_node.planned_start_at::date, tp.arrival_date)
                          )
                    )
                  )
              )
            ORDER BY lead_start_date ASC, tp.created_at DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        {"market_id": market_id, "guide_user_id": guide_user_id, "limit": limit, "offset": offset},
    )
    return [_dict(row) for row in rows]


def list_partner_leads_for_traveler(
    session: Session,
    *,
    market_id: UUID,
    traveler_user_id: UUID,
    limit: int,
    offset: int,
) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            WITH my_segments AS (
                SELECT rn.region_id,
                       COALESCE(rn.planned_start_at::date, tp.arrival_date) AS start_date,
                       COALESCE(rn.planned_end_at::date, rn.planned_start_at::date, tp.arrival_date) AS end_date
                FROM travel_plans tp
                JOIN itinerary_route_nodes rn ON rn.travel_plan_id = tp.id
                WHERE tp.market_id = :market_id
                  AND tp.traveler_user_id = :traveler_user_id
                  AND (tp.looking_for_partner = true OR rn.looking_for_partner = true)
                  AND tp.status = 'active'
                  AND tp.deleted_at IS NULL
            )
            SELECT DISTINCT ON (tp.id, rn.region_id)
                   tp.id AS travel_plan_id,
                   tp.traveler_user_id,
                   u.display_name AS traveler_display_name,
                   u.avatar_url AS traveler_avatar_url,
                   rn.region_id AS overlap_region_id,
                   r.name AS overlap_region_name,
                   GREATEST(COALESCE(rn.planned_start_at::date, tp.arrival_date), ms.start_date) AS overlap_start_date,
                   LEAST(COALESCE(rn.planned_end_at::date, rn.planned_start_at::date, tp.arrival_date), ms.end_date) AS overlap_end_date,
                   tp.traveler_count,
                   tp.partner_note
            FROM my_segments ms
            JOIN travel_plans tp ON tp.market_id = :market_id
            JOIN itinerary_route_nodes rn ON rn.travel_plan_id = tp.id
            JOIN regions r ON r.id = rn.region_id
            JOIN users u ON u.id = tp.traveler_user_id
            WHERE tp.traveler_user_id <> :traveler_user_id
              AND (tp.looking_for_partner = true OR rn.looking_for_partner = true)
              AND tp.status = 'active'
              AND tp.deleted_at IS NULL
              AND rn.region_id = ms.region_id
              AND COALESCE(rn.planned_start_at::date, tp.arrival_date) <= ms.end_date
              AND COALESCE(rn.planned_end_at::date, rn.planned_start_at::date, tp.arrival_date) >= ms.start_date
            ORDER BY tp.id, rn.region_id, overlap_start_date ASC
            LIMIT :limit OFFSET :offset
            """
        ),
        {
            "market_id": market_id,
            "traveler_user_id": traveler_user_id,
            "limit": limit,
            "offset": offset,
        },
    )
    return [_dict(row) for row in rows]


def _order_route_points(session: Session, route: dict[str, Any]) -> list[dict[str, Any]]:
    if route["travel_plan_id"] is not None:
        rows = session.execute(
            text(
                """
                SELECT r.id AS region_id, r.name, r.latitude, r.longitude, rn.sequence
                FROM itinerary_route_nodes rn
                JOIN regions r ON r.id = rn.region_id
                WHERE rn.travel_plan_id = :travel_plan_id
                  AND r.latitude IS NOT NULL
                  AND r.longitude IS NOT NULL
                ORDER BY rn.sequence
                """
            ),
            {"travel_plan_id": route["travel_plan_id"]},
        )
        points = [_point(row) for row in rows]
        if points:
            return points
    if route["service_latitude"] is not None and route["service_longitude"] is not None:
        return [
            {
                "region_id": route["service_region_id"],
                "name": route["service_region_name"],
                "lat": route["service_latitude"],
                "lng": route["service_longitude"],
            }
        ]
    return []


def _point(row: Any) -> dict[str, Any]:
    data = _dict(row)
    return {
        "region_id": data["region_id"],
        "name": data["name"],
        "lat": data["latitude"],
        "lng": data["longitude"],
    }


def _route_status(order_status: str, start_date: date | None, end_date: date | None) -> str:
    today = date.today()
    if order_status in {"completed", "closed"}:
        return "historical"
    if order_status in {"in_service"}:
        return "ongoing"
    if start_date and end_date and start_date <= today <= end_date:
        return "ongoing"
    return "upcoming"


def _traveler_calendar_events(session: Session, *, market_id: UUID, user_id: UUID) -> list[dict[str, Any]]:
    plan_rows = session.execute(
        text(
            """
            SELECT tp.id, tp.title, tp.status, tp.arrival_date,
                   MIN(COALESCE(rn.planned_start_at::date, tp.arrival_date)) AS start_date,
                   MAX(COALESCE(rn.planned_end_at::date, rn.planned_start_at::date, tp.arrival_date)) AS end_date
            FROM travel_plans tp
            LEFT JOIN itinerary_route_nodes rn ON rn.travel_plan_id = tp.id
            WHERE tp.market_id = :market_id
              AND tp.traveler_user_id = :user_id
              AND tp.deleted_at IS NULL
            GROUP BY tp.id
            ORDER BY start_date
            """
        ),
        {"market_id": market_id, "user_id": user_id},
    )
    events = [
        {
            "id": f"plan:{row.id}",
            "source_type": "travel_plan",
            "source_id": row.id,
            "role": "traveler",
            "title": row.title or "旅行计划",
            "start_date": row.start_date or row.arrival_date,
            "end_date": row.end_date or row.arrival_date,
            "status": row.status,
            "color": "green",
            "line_style": "dashed",
        }
        for row in plan_rows
    ]
    events.extend(_order_calendar_events(session, market_id=market_id, user_id=user_id, role="traveler"))
    return events


def _guide_calendar_events(session: Session, *, market_id: UUID, user_id: UUID) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT gaw.id, gaw.available_start_date, gaw.available_end_date, gaw.status,
                   r.name AS region_name
            FROM guide_availability_windows gaw
            LEFT JOIN regions r ON r.id = gaw.region_id
            WHERE gaw.market_id = :market_id
              AND gaw.guide_user_id = :user_id
              AND gaw.deleted_at IS NULL
            ORDER BY gaw.available_start_date
            """
        ),
        {"market_id": market_id, "user_id": user_id},
    )
    events = [
        {
            "id": f"availability:{row.id}",
            "source_type": "guide_availability",
            "source_id": row.id,
            "role": "guide",
            "title": f"可服务：{row.region_name or '全部服务地区'}",
            "start_date": row.available_start_date,
            "end_date": row.available_end_date,
            "status": row.status,
            "color": "green",
            "line_style": "solid",
        }
        for row in rows
    ]
    events.extend(_order_calendar_events(session, market_id=market_id, user_id=user_id, role="guide"))
    return events


def _order_calendar_events(session: Session, *, market_id: UUID, user_id: UUID, role: str) -> list[dict[str, Any]]:
    participant_clause = "traveler_user_id = :user_id" if role == "traveler" else "guide_user_id = :user_id"
    rows = session.execute(
        text(
            f"""
            SELECT id, status, service_start_date, service_end_date, traveler_user_id, guide_user_id
            FROM service_orders
            WHERE market_id = :market_id
              AND deleted_at IS NULL
              AND {participant_clause}
              AND status IN ('confirmed', 'paid_confirmed', 'reserved', 'in_service', 'completed')
            ORDER BY service_start_date
            """
        ),
        {"market_id": market_id, "user_id": user_id},
    )
    events = []
    for row in rows:
        color = "gray" if row.status == "completed" else "blue" if row.status == "in_service" else "red" if role == "guide" else "green"
        events.append(
            {
                "id": f"order:{row.id}",
                "source_type": "order",
                "source_id": row.id,
                "role": role,
                "title": "已预约订单" if row.status != "in_service" else "进行中订单",
                "start_date": row.service_start_date,
                "end_date": row.service_end_date or row.service_start_date,
                "status": row.status,
                "color": color,
                "line_style": "solid",
            }
        )
    return events
