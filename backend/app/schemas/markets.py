from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


RegionType = Literal[
    "country",
    "province",
    "city",
    "district",
    "airport",
    "station",
    "attraction",
    "custom",
]


class RegionCreateRequest(BaseModel):
    parent_id: UUID | None = None
    type: RegionType
    country_code: str = Field(min_length=2, max_length=2)
    code: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=160)
    localized_names: dict[str, Any] = Field(default_factory=dict)
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    timezone: str | None = Field(default=None, max_length=80)


class ExchangeRateQuoteRequest(BaseModel):
    source_currency: str = Field(min_length=3, max_length=3)
    target_currency: str = Field(min_length=3, max_length=3)
    amount: Decimal = Field(default=Decimal("1"), gt=0)
