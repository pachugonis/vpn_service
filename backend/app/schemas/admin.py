from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr


class ServerCreate(BaseModel):
    name: str
    location: str
    flag_emoji: str | None = None
    url: str
    username: str
    password: str
    inbound_id: int
    is_active: bool = True


class ServerUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    flag_emoji: str | None = None
    url: str | None = None
    username: str | None = None
    password: str | None = None
    inbound_id: int | None = None
    is_active: bool | None = None


class ServerTestConnection(BaseModel):
    url: str
    username: str
    password: str
    inbound_id: int


class ServerTestResult(BaseModel):
    ok: bool
    message: str


class ServerAdminResponse(BaseModel):
    id: int
    name: str
    location: str
    flag_emoji: str | None
    url: str
    username: str
    inbound_id: int
    is_active: bool
    load_pct: int

    model_config = {"from_attributes": True}


class PlanCreate(BaseModel):
    name: str
    duration_days: int
    price_rub: Decimal
    traffic_gb: int | None = None
    is_active: bool = True


class PlanUpdate(BaseModel):
    name: str | None = None
    duration_days: int | None = None
    price_rub: Decimal | None = None
    traffic_gb: int | None = None
    is_active: bool | None = None


class PlanAdminResponse(BaseModel):
    id: int
    name: str
    duration_days: int
    price_rub: Decimal
    traffic_gb: int | None
    is_active: bool

    model_config = {"from_attributes": True}


class UserAdminResponse(BaseModel):
    id: int
    email: EmailStr
    is_active: bool
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    is_active: bool | None = None


class SiteSettingsResponse(BaseModel):
    maintenance_mode: bool

    model_config = {"from_attributes": True}


class SiteSettingsUpdate(BaseModel):
    maintenance_mode: bool
