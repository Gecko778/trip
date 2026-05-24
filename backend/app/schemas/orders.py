from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class OrderCreateRequest(BaseModel):
    guide_user_id: UUID
    traveler_user_id: UUID | None = None
    travel_plan_id: UUID | None = None
    message_thread_id: UUID | None = None
    guide_price_amount: Decimal = Field(ge=0)
    guide_price_currency: str = Field(min_length=3, max_length=3)
    service_start_date: date
    service_end_date: date | None = None
    service_region_id: UUID | None = None
    needs_pickup: bool = False
    traveler_count: int = Field(default=1, ge=1)
    itinerary_json: dict[str, Any] = Field(default_factory=dict)
    cancellation_policy: str = Field(min_length=1, max_length=2000)
    breach_responsibility: str = Field(min_length=1, max_length=2000)

    @model_validator(mode="after")
    def validate_dates(self) -> "OrderCreateRequest":
        if self.service_end_date is not None and self.service_end_date < self.service_start_date:
            raise ValueError("service_end_date must be on or after service_start_date")
        return self


class OrderCancelRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=1000)


class ReviewCreateRequest(BaseModel):
    rating: Decimal = Field(ge=1, le=5)
    body: str | None = Field(default=None, max_length=4000)
    dimensions_json: dict[str, Any] = Field(default_factory=dict)


class NotificationReadRequest(BaseModel):
    read: bool = True
