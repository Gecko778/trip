from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def _dict(row: Any) -> dict[str, Any]:
    return dict(row._mapping)


def create_notification(
    session: Session,
    *,
    user_id: UUID,
    notification_type: str,
    title: str,
    body: str | None = None,
    market_id: UUID | None = None,
    related_order_id: UUID | None = None,
    related_thread_id: UUID | None = None,
    related_agreement_id: UUID | None = None,
) -> dict[str, Any]:
    row = session.execute(
        text(
            """
            INSERT INTO notification_records (
                market_id, user_id, type, related_order_id, related_thread_id,
                related_agreement_id, title, body
            )
            VALUES (
                :market_id, :user_id, CAST(:notification_type AS notification_type_enum),
                :related_order_id, :related_thread_id, :related_agreement_id, :title, :body
            )
            RETURNING id, market_id, user_id, type, related_order_id, related_thread_id,
                      related_agreement_id, title, body, read_at, created_at
            """
        ),
        {
            "market_id": market_id,
            "user_id": user_id,
            "notification_type": notification_type,
            "related_order_id": related_order_id,
            "related_thread_id": related_thread_id,
            "related_agreement_id": related_agreement_id,
            "title": title,
            "body": body,
        },
    ).first()
    if row is None:
        raise RuntimeError("Failed to create notification")
    return _dict(row)


def list_notifications(
    session: Session,
    *,
    user_id: UUID,
    limit: int,
    offset: int,
) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id, market_id, user_id, type, related_order_id, related_thread_id,
                   related_agreement_id, title, body, read_at, created_at
            FROM notification_records
            WHERE user_id = :user_id AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        {"user_id": user_id, "limit": limit, "offset": offset},
    )
    return [_dict(row) for row in rows]


def mark_notification_read(
    session: Session,
    *,
    notification_id: UUID,
    user_id: UUID,
) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            UPDATE notification_records
            SET read_at = now()
            WHERE id = :notification_id
              AND user_id = :user_id
              AND deleted_at IS NULL
            RETURNING id, market_id, user_id, type, related_order_id, related_thread_id,
                      related_agreement_id, title, body, read_at, created_at
            """
        ),
        {"notification_id": notification_id, "user_id": user_id},
    ).first()
    return _dict(row) if row else None
