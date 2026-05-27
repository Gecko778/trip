from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def _dict(row: Any) -> dict[str, Any]:
    return dict(row._mapping)


def follow_user(
    session: Session,
    *,
    follower_user_id: UUID,
    followed_user_id: UUID,
    market_id: UUID | None,
) -> dict[str, Any]:
    row = session.execute(
        text(
            """
            INSERT INTO follow_relations (follower_user_id, followed_user_id, market_id)
            VALUES (:follower_user_id, :followed_user_id, :market_id)
            ON CONFLICT (follower_user_id, followed_user_id) DO UPDATE
            SET market_id = EXCLUDED.market_id,
                deleted_at = NULL,
                created_at = now()
            RETURNING follower_user_id, followed_user_id, market_id, created_at
            """
        ),
        {
            "follower_user_id": follower_user_id,
            "followed_user_id": followed_user_id,
            "market_id": market_id,
        },
    ).first()
    if row is None:
        raise RuntimeError("Failed to follow user")
    return _dict(row)


def unfollow_user(session: Session, *, follower_user_id: UUID, followed_user_id: UUID) -> bool:
    result = session.execute(
        text(
            """
            UPDATE follow_relations
            SET deleted_at = now()
            WHERE follower_user_id = :follower_user_id
              AND followed_user_id = :followed_user_id
              AND deleted_at IS NULL
            """
        ),
        {"follower_user_id": follower_user_id, "followed_user_id": followed_user_id},
    )
    return result.rowcount > 0


def is_following(session: Session, *, follower_user_id: UUID, followed_user_id: UUID) -> bool:
    row = session.execute(
        text(
            """
            SELECT 1
            FROM follow_relations
            WHERE follower_user_id = :follower_user_id
              AND followed_user_id = :followed_user_id
              AND deleted_at IS NULL
            LIMIT 1
            """
        ),
        {"follower_user_id": follower_user_id, "followed_user_id": followed_user_id},
    ).first()
    return row is not None


def list_followed_users(session: Session, *, follower_user_id: UUID) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT u.id, u.display_name, u.avatar_url, fr.market_id, fr.created_at
            FROM follow_relations fr
            JOIN users u ON u.id = fr.followed_user_id
            WHERE fr.follower_user_id = :follower_user_id
              AND fr.deleted_at IS NULL
              AND u.deleted_at IS NULL
            ORDER BY fr.created_at DESC
            """
        ),
        {"follower_user_id": follower_user_id},
    )
    return [_dict(row) for row in rows]


def block_user(
    session: Session,
    *,
    blocker_user_id: UUID,
    blocked_user_id: UUID,
    market_id: UUID | None,
    reason: str | None,
) -> dict[str, Any]:
    row = session.execute(
        text(
            """
            INSERT INTO user_blocks (blocker_user_id, blocked_user_id, market_id, reason)
            VALUES (:blocker_user_id, :blocked_user_id, :market_id, :reason)
            ON CONFLICT (blocker_user_id, blocked_user_id) DO UPDATE
            SET market_id = EXCLUDED.market_id,
                reason = EXCLUDED.reason,
                deleted_at = NULL,
                created_at = now()
            RETURNING blocker_user_id, blocked_user_id, market_id, reason, created_at
            """
        ),
        {
            "blocker_user_id": blocker_user_id,
            "blocked_user_id": blocked_user_id,
            "market_id": market_id,
            "reason": reason,
        },
    ).first()
    if row is None:
        raise RuntimeError("Failed to block user")
    return _dict(row)


def unblock_user(session: Session, *, blocker_user_id: UUID, blocked_user_id: UUID) -> bool:
    result = session.execute(
        text(
            """
            UPDATE user_blocks
            SET deleted_at = now()
            WHERE blocker_user_id = :blocker_user_id
              AND blocked_user_id = :blocked_user_id
              AND deleted_at IS NULL
            """
        ),
        {"blocker_user_id": blocker_user_id, "blocked_user_id": blocked_user_id},
    )
    return result.rowcount > 0


def is_blocked_between(session: Session, user_a_id: UUID, user_b_id: UUID) -> bool:
    row = session.execute(
        text(
            """
            SELECT 1
            FROM user_blocks
            WHERE deleted_at IS NULL
              AND (
                  (blocker_user_id = :user_a_id AND blocked_user_id = :user_b_id)
                  OR (blocker_user_id = :user_b_id AND blocked_user_id = :user_a_id)
              )
            LIMIT 1
            """
        ),
        {"user_a_id": user_a_id, "user_b_id": user_b_id},
    ).first()
    return row is not None


def are_mutual_followers(session: Session, user_a_id: UUID, user_b_id: UUID) -> bool:
    row = session.execute(
        text(
            """
            SELECT 1
            WHERE EXISTS (
                SELECT 1 FROM follow_relations
                WHERE follower_user_id = :user_a_id
                  AND followed_user_id = :user_b_id
                  AND deleted_at IS NULL
            )
            AND EXISTS (
                SELECT 1 FROM follow_relations
                WHERE follower_user_id = :user_b_id
                  AND followed_user_id = :user_a_id
                  AND deleted_at IS NULL
            )
            """
        ),
        {"user_a_id": user_a_id, "user_b_id": user_b_id},
    ).first()
    return row is not None


def get_or_create_thread(
    session: Session,
    *,
    market_id: UUID,
    initiator_user_id: UUID,
    recipient_user_id: UUID,
    travel_plan_id: UUID | None,
) -> dict[str, Any]:
    existing = find_thread(
        session,
        market_id=market_id,
        user_a_id=initiator_user_id,
        user_b_id=recipient_user_id,
        travel_plan_id=travel_plan_id,
    )
    if existing is not None:
        return existing
    is_mutual_follow = are_mutual_followers(session, initiator_user_id, recipient_user_id)
    row = session.execute(
        text(
            """
            INSERT INTO message_threads (
                market_id, initiator_user_id, recipient_user_id, travel_plan_id,
                is_mutual_follow, restriction_status
            )
            VALUES (
                :market_id, :initiator_user_id, :recipient_user_id, :travel_plan_id,
                :is_mutual_follow,
                CASE WHEN :is_mutual_follow THEN 'unrestricted' ELSE 'greeting_allowed' END
            )
            RETURNING id
            """
        ),
        {
            "market_id": market_id,
            "initiator_user_id": initiator_user_id,
            "recipient_user_id": recipient_user_id,
            "travel_plan_id": travel_plan_id,
            "is_mutual_follow": is_mutual_follow,
        },
    ).first()
    if row is None:
        raise RuntimeError("Failed to create message thread")
    return get_thread(session, row[0])


def find_thread(
    session: Session,
    *,
    market_id: UUID,
    user_a_id: UUID,
    user_b_id: UUID,
    travel_plan_id: UUID | None,
) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT id
            FROM message_threads
            WHERE market_id = :market_id
              AND deleted_at IS NULL
              AND (
                  (initiator_user_id = :user_a_id AND recipient_user_id = :user_b_id)
                  OR (initiator_user_id = :user_b_id AND recipient_user_id = :user_a_id)
              )
              AND travel_plan_id IS NULL
            ORDER BY updated_at DESC
            LIMIT 1
            """
        )
        if travel_plan_id is None
        else text(
            """
            SELECT id
            FROM message_threads
            WHERE market_id = :market_id
              AND deleted_at IS NULL
              AND (
                  (initiator_user_id = :user_a_id AND recipient_user_id = :user_b_id)
                  OR (initiator_user_id = :user_b_id AND recipient_user_id = :user_a_id)
              )
              AND travel_plan_id = :travel_plan_id
            ORDER BY updated_at DESC
            LIMIT 1
            """
        ),
        {
            "market_id": market_id,
            "user_a_id": user_a_id,
            "user_b_id": user_b_id,
            "travel_plan_id": travel_plan_id,
        },
    ).first()
    return get_thread(session, row[0]) if row else None


def list_threads(session: Session, *, market_id: UUID, user_id: UUID) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id
            FROM message_threads
            WHERE market_id = :market_id
              AND deleted_at IS NULL
              AND (initiator_user_id = :user_id OR recipient_user_id = :user_id)
            ORDER BY COALESCE(last_message_at, created_at) DESC
            """
        ),
        {"market_id": market_id, "user_id": user_id},
    )
    return [get_thread(session, row[0]) for row in rows]


def get_thread(session: Session, thread_id: UUID) -> dict[str, Any] | None:
    row = session.execute(
        text(
            """
            SELECT mt.id, mt.market_id, mt.initiator_user_id, mt.recipient_user_id, mt.travel_plan_id,
                   mt.is_mutual_follow, mt.greeting_sent, mt.recipient_replied,
                   mt.restriction_status, mt.contact_risk_detected, mt.risk_level,
                   mt.last_message_at, mt.created_at, mt.updated_at,
                   iu.display_name AS initiator_display_name,
                   iu.avatar_url AS initiator_avatar_url,
                   ru.display_name AS recipient_display_name,
                   ru.avatar_url AS recipient_avatar_url,
                   lm.body AS last_message_body,
                   lm.sender_user_id AS last_message_sender_user_id,
                   lm.created_at AS last_message_created_at
            FROM message_threads mt
            JOIN users iu ON iu.id = mt.initiator_user_id
            JOIN users ru ON ru.id = mt.recipient_user_id
            LEFT JOIN LATERAL (
                SELECT body, sender_user_id, created_at
                FROM messages
                WHERE thread_id = mt.id AND deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT 1
            ) lm ON true
            WHERE mt.id = :thread_id AND mt.deleted_at IS NULL
            """
        ),
        {"thread_id": thread_id},
    ).first()
    return _dict(row) if row else None


def create_message(
    session: Session,
    *,
    thread: dict[str, Any],
    sender_user_id: UUID,
    body: str,
) -> dict[str, Any]:
    row = session.execute(
        text(
            """
            INSERT INTO messages (thread_id, sender_user_id, body)
            VALUES (:thread_id, :sender_user_id, :body)
            RETURNING id, thread_id, sender_user_id, sender_type, body,
                      contact_risk_detected, risk_level, created_at
            """
        ),
        {"thread_id": thread["id"], "sender_user_id": sender_user_id, "body": body},
    ).first()
    if row is None:
        raise RuntimeError("Failed to create message")
    _update_thread_after_message(session, thread=thread, sender_user_id=sender_user_id)
    return _dict(row)


def _update_thread_after_message(
    session: Session,
    *,
    thread: dict[str, Any],
    sender_user_id: UUID,
) -> None:
    is_recipient_reply = sender_user_id == thread["recipient_user_id"]
    is_initiator_message = sender_user_id == thread["initiator_user_id"]
    session.execute(
        text(
            """
            UPDATE message_threads
            SET is_mutual_follow = :is_mutual_follow,
                greeting_sent = greeting_sent OR :is_initiator_message,
                recipient_replied = recipient_replied OR :is_recipient_reply,
                restriction_status = CASE
                    WHEN :is_mutual_follow OR recipient_replied OR :is_recipient_reply
                    THEN 'unrestricted'
                    WHEN greeting_sent OR :is_initiator_message
                    THEN 'awaiting_reply'
                    ELSE 'greeting_allowed'
                END,
                last_message_at = now(),
                updated_at = now()
            WHERE id = :thread_id
            """
        ),
        {
            "thread_id": thread["id"],
            "is_mutual_follow": are_mutual_followers(
                session,
                thread["initiator_user_id"],
                thread["recipient_user_id"],
            ),
            "is_initiator_message": is_initiator_message,
            "is_recipient_reply": is_recipient_reply,
        },
    )


def list_messages(session: Session, *, thread_id: UUID, limit: int, offset: int) -> list[dict[str, Any]]:
    rows = session.execute(
        text(
            """
            SELECT id, thread_id, sender_user_id, sender_type, body,
                   contact_risk_detected, risk_level, created_at
            FROM messages
            WHERE thread_id = :thread_id AND deleted_at IS NULL
            ORDER BY created_at ASC
            LIMIT :limit OFFSET :offset
            """
        ),
        {"thread_id": thread_id, "limit": limit, "offset": offset},
    )
    return [_dict(row) for row in rows]
