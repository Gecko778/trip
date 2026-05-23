from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


PasswordAuthProvider = Literal["email", "phone"]
OAuthProvider = Literal["google", "apple"]


class RegisterRequest(BaseModel):
    provider: PasswordAuthProvider
    identifier: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=120)
    preferred_locale: str = "en-US"
    preferred_currency: str = "CNY"


class LoginRequest(BaseModel):
    provider: PasswordAuthProvider
    identifier: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)


class OAuthLoginRequest(BaseModel):
    provider: OAuthProvider
    id_token: str = Field(min_length=1)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class LogoutRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class AdminInvitationCreateRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    role_code: str = Field(min_length=1, max_length=80)
    market_id: UUID | None = None
    expires_in_days: int = Field(default=7, ge=1, le=30)


class AdminInvitationAcceptRequest(BaseModel):
    invitation_token: str = Field(min_length=1)
    display_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    preferred_locale: str = "en-US"
    preferred_currency: str = "CNY"


class RoleSwitchRequest(BaseModel):
    role: Literal["traveler", "guide"]
    market_id: UUID | None = None


class UserRoleAssignRequest(BaseModel):
    role_code: str = Field(min_length=1, max_length=80)
    market_id: UUID | None = None


class UserUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=500)
    preferred_locale: str | None = None
    preferred_currency: str | None = Field(default=None, min_length=3, max_length=3)


class MarketConfigUpdateRequest(BaseModel):
    supported_locales: list[str] | None = None
    supported_display_currencies: list[str] | None = None
    default_search_region_id: UUID | None = None
    config_json: dict[str, Any] | None = None
