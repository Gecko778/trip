from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

PlanVisibility = Literal["public", "guides_only", "travelers_only", "private"]
PlanStatus = Literal[
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


class TravelPlanCreateRequest(BaseModel):
    country_code: str = Field(min_length=2, max_length=2)
    arrival_date: date
    arrival_region_id: UUID | None = None
    needs_pickup: bool = False
    traveler_count: int = Field(gt=0)
    budget_min_amount: Decimal | None = Field(default=None, ge=0)
    budget_max_amount: Decimal | None = Field(default=None, ge=0)
    budget_currency: str | None = Field(default=None, min_length=3, max_length=3)
    visibility: PlanVisibility = "guides_only"
    title: str | None = Field(default=None, max_length=200)
    notes: str | None = None


class TravelPlanUpdateRequest(BaseModel):
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    arrival_date: date | None = None
    arrival_region_id: UUID | None = None
    needs_pickup: bool | None = None
    traveler_count: int | None = Field(default=None, gt=0)
    budget_min_amount: Decimal | None = Field(default=None, ge=0)
    budget_max_amount: Decimal | None = Field(default=None, ge=0)
    budget_currency: str | None = Field(default=None, min_length=3, max_length=3)
    visibility: PlanVisibility | None = None
    title: str | None = Field(default=None, max_length=200)
    notes: str | None = None


class RouteNodeCreateRequest(BaseModel):
    region_id: UUID | None = None
    sequence: int = Field(ge=1)
    planned_start_at: datetime | None = None
    planned_end_at: datetime | None = None
    notes: str | None = None


class RouteNodeUpdateRequest(BaseModel):
    region_id: UUID | None = None
    sequence: int | None = Field(default=None, ge=1)
    planned_start_at: datetime | None = None
    planned_end_at: datetime | None = None
    notes: str | None = None
