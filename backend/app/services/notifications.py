from typing import Protocol
from uuid import UUID

from sqlalchemy.orm import Session

from app.repositories import notifications as notification_repository


class NotificationDelivery(Protocol):
    def send_email(self, *, user_id: UUID, title: str, body: str | None) -> None:
        ...

    def send_push(self, *, user_id: UUID, title: str, body: str | None) -> None:
        ...


class NoopNotificationDelivery:
    def send_email(self, *, user_id: UUID, title: str, body: str | None) -> None:
        return None

    def send_push(self, *, user_id: UUID, title: str, body: str | None) -> None:
        return None


delivery: NotificationDelivery = NoopNotificationDelivery()


def notify_user(
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
) -> dict:
    notification = notification_repository.create_notification(
        session,
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        body=body,
        market_id=market_id,
        related_order_id=related_order_id,
        related_thread_id=related_thread_id,
        related_agreement_id=related_agreement_id,
    )
    delivery.send_email(user_id=user_id, title=title, body=body)
    delivery.send_push(user_id=user_id, title=title, body=body)
    return notification
