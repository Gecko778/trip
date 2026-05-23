from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.permissions import get_current_user
from app.core.responses import envelope
from app.db.deps import get_db_session
from app.repositories import auth as auth_repository
from app.repositories import communications as communication_repository
from app.repositories import markets as market_repository
from app.schemas.communications import (
    BlockUserRequest,
    MessageCreateRequest,
    MessageThreadCreateRequest,
)

router = APIRouter(prefix="/api/v1", tags=["communications"])


@router.post("/markets/{market_id}/message-threads")
def create_message_thread(
    market_id: UUID,
    payload: MessageThreadCreateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    if payload.recipient_user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot create thread with self")
    if market_repository.get_market(session, market_id) is None:
        raise HTTPException(status_code=404, detail="Market not found")
    if auth_repository.get_user(session, payload.recipient_user_id) is None:
        raise HTTPException(status_code=404, detail="Recipient user not found")
    if communication_repository.is_blocked_between(session, current_user["id"], payload.recipient_user_id):
        raise HTTPException(status_code=403, detail="User is blocked")
    try:
        thread = communication_repository.get_or_create_thread(
            session,
            market_id=market_id,
            initiator_user_id=current_user["id"],
            recipient_user_id=payload.recipient_user_id,
            travel_plan_id=payload.travel_plan_id,
        )
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail="Invalid message thread reference") from exc
    return envelope(data=thread, trace_id=request.state.trace_id)


@router.get("/markets/{market_id}/message-threads")
def list_my_message_threads(
    market_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    if market_repository.get_market(session, market_id) is None:
        raise HTTPException(status_code=404, detail="Market not found")
    return envelope(
        data=communication_repository.list_threads(
            session,
            market_id=market_id,
            user_id=current_user["id"],
        ),
        trace_id=request.state.trace_id,
    )


@router.get("/message-threads/{thread_id}")
def get_message_thread(
    thread_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    thread = _get_participating_thread(session, thread_id, current_user["id"])
    return envelope(data=thread, trace_id=request.state.trace_id)


@router.get("/message-threads/{thread_id}/messages")
def list_thread_messages(
    thread_id: UUID,
    request: Request,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    _get_participating_thread(session, thread_id, current_user["id"])
    return envelope(
        data=communication_repository.list_messages(
            session,
            thread_id=thread_id,
            limit=limit,
            offset=offset,
        ),
        meta={"limit": limit, "offset": offset},
        trace_id=request.state.trace_id,
    )


@router.post("/message-threads/{thread_id}/messages")
def send_message(
    thread_id: UUID,
    payload: MessageCreateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    thread = _get_participating_thread(session, thread_id, current_user["id"])
    other_user_id = _other_participant(thread, current_user["id"])
    if communication_repository.is_blocked_between(session, current_user["id"], other_user_id):
        raise HTTPException(status_code=403, detail="User is blocked")
    _ensure_message_allowed(thread, current_user["id"])
    message = communication_repository.create_message(
        session,
        thread=thread,
        sender_user_id=current_user["id"],
        body=payload.body,
    )
    session.commit()
    return envelope(data=message, trace_id=request.state.trace_id)


@router.post("/users/{user_id}/follow")
def follow_user(
    user_id: UUID,
    request: Request,
    market_id: UUID | None = None,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot follow self")
    if auth_repository.get_user(session, user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")
    follow = communication_repository.follow_user(
        session,
        follower_user_id=current_user["id"],
        followed_user_id=user_id,
        market_id=market_id,
    )
    session.commit()
    return envelope(data=follow, trace_id=request.state.trace_id)


@router.delete("/users/{user_id}/follow")
def unfollow_user(
    user_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    deleted = communication_repository.unfollow_user(
        session,
        follower_user_id=current_user["id"],
        followed_user_id=user_id,
    )
    session.commit()
    return envelope(data={"deleted": deleted}, trace_id=request.state.trace_id)


@router.post("/users/{user_id}/block")
def block_user(
    user_id: UUID,
    payload: BlockUserRequest,
    request: Request,
    market_id: UUID | None = None,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot block self")
    if auth_repository.get_user(session, user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")
    block = communication_repository.block_user(
        session,
        blocker_user_id=current_user["id"],
        blocked_user_id=user_id,
        market_id=market_id,
        reason=payload.reason,
    )
    session.commit()
    return envelope(data=block, trace_id=request.state.trace_id)


@router.delete("/users/{user_id}/block")
def unblock_user(
    user_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict:
    deleted = communication_repository.unblock_user(
        session,
        blocker_user_id=current_user["id"],
        blocked_user_id=user_id,
    )
    session.commit()
    return envelope(data={"deleted": deleted}, trace_id=request.state.trace_id)


def _get_participating_thread(session: Session, thread_id: UUID, user_id: UUID) -> dict:
    thread = communication_repository.get_thread(session, thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Message thread not found")
    if user_id not in {thread["initiator_user_id"], thread["recipient_user_id"]}:
        raise HTTPException(status_code=403, detail="Permission denied")
    return thread


def _other_participant(thread: dict, user_id: UUID) -> UUID:
    if user_id == thread["initiator_user_id"]:
        return thread["recipient_user_id"]
    return thread["initiator_user_id"]


def _ensure_message_allowed(thread: dict, sender_user_id: UUID) -> None:
    if thread["is_mutual_follow"] or thread["recipient_replied"]:
        return
    if sender_user_id == thread["recipient_user_id"]:
        return
    if not thread["greeting_sent"]:
        return
    raise HTTPException(status_code=403, detail="Greeting already sent; waiting for reply")
