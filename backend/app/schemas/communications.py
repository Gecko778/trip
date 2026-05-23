from uuid import UUID

from pydantic import BaseModel, Field


class MessageThreadCreateRequest(BaseModel):
    recipient_user_id: UUID
    travel_plan_id: UUID | None = None


class MessageCreateRequest(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class BlockUserRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=1000)
