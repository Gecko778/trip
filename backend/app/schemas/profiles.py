from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

Gender = Literal["unknown", "female", "male", "non_binary", "prefer_not_to_say"]
OnboardingStatus = Literal[
    "draft",
    "submitted",
    "under_review",
    "approved",
    "rejected",
    "locked",
    "active",
    "inactive",
    "archived",
]


class TravelerProfileCreateRequest(BaseModel):
    market_id: UUID
    preference_json: dict[str, Any] = Field(default_factory=dict)


class TravelerProfileUpdateRequest(BaseModel):
    preference_json: dict[str, Any] = Field(default_factory=dict)


class GuideProfileCreateRequest(BaseModel):
    market_id: UUID
    country_code: str = Field(min_length=2, max_length=2)
    home_region_id: UUID
    daily_price_amount: Decimal = Field(ge=0)
    quote_currency: str = Field(min_length=3, max_length=3)
    offers_pickup: bool = False
    gender: Gender = "unknown"
    birth_year: int | None = Field(default=None, ge=1900, le=2100)
    language_tags: list[str] = Field(default_factory=list)
    service_region_ids: list[UUID] = Field(default_factory=list)


class GuideProfileUpdateRequest(BaseModel):
    home_region_id: UUID | None = None
    daily_price_amount: Decimal | None = Field(default=None, ge=0)
    quote_currency: str | None = Field(default=None, min_length=3, max_length=3)
    offers_pickup: bool | None = None
    gender: Gender | None = None
    birth_year: int | None = Field(default=None, ge=1900, le=2100)
    language_tags: list[str] | None = None
    service_region_ids: list[UUID] | None = None


class OnboardingUpdateRequest(BaseModel):
    role: Literal["traveler", "guide"]
    status: OnboardingStatus
    market_id: UUID | None = None


class GuideVerificationReviewRequest(BaseModel):
    status: Literal["approved", "rejected"]
    failure_reason: str | None = Field(default=None, max_length=1000)
