from datetime import datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

Status = Literal["draft", "active", "inactive", "archived"]


class PercentageCommissionPolicyCreateRequest(BaseModel):
    service_type: str = Field(default="guide_service", min_length=1, max_length=80)
    commission_rate: Decimal = Field(gt=0, le=1)
    currency_code: str | None = Field(default=None, min_length=3, max_length=3)
    min_fee_amount: Decimal | None = Field(default=None, ge=0)
    max_fee_amount: Decimal | None = Field(default=None, ge=0)
    status: Status = "active"
    effective_at: datetime | None = None
    expires_at: datetime | None = None


class FixedFeeCommissionPolicyCreateRequest(BaseModel):
    service_type: str = Field(default="guide_service", min_length=1, max_length=80)
    fixed_service_fee_amount: Decimal = Field(ge=0)
    currency_code: str = Field(min_length=3, max_length=3)
    status: Status = "active"
    effective_at: datetime | None = None
    expires_at: datetime | None = None


class PaymentPlaceholderCreateRequest(BaseModel):
    payment_type: str = Field(default="mvp_placeholder", min_length=1, max_length=80)
    payment_method_code: str | None = Field(default=None, max_length=80)
    payment_country_code: str | None = Field(default=None, min_length=2, max_length=2)


class PayoutAccountCreateRequest(BaseModel):
    account_type: str = Field(min_length=1, max_length=80)
    provider_code: str = Field(default="manual", min_length=1, max_length=80)
    country_code: str = Field(min_length=2, max_length=2)
    currency_code: str = Field(min_length=3, max_length=3)
    account_reference: str | None = Field(default=None, max_length=500)
    is_default: bool = False


class MembershipPlanCreateRequest(BaseModel):
    code: str = Field(min_length=1, max_length=80)
    member_role: Literal["traveler", "guide", "admin", "reviewer", "support"]
    billing_period: str = Field(min_length=1, max_length=40)
    price_amount: Decimal = Field(ge=0)
    currency_code: str = Field(min_length=3, max_length=3)
    benefits_json: dict[str, Any] = Field(default_factory=dict)
    status: Status = "draft"


class MembershipSubscriptionCreateRequest(BaseModel):
    status: Status = "draft"
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class DisputeCreateRequest(BaseModel):
    dispute_type: str = Field(min_length=1, max_length=120)
    evidence_json: dict[str, Any] = Field(default_factory=dict)
