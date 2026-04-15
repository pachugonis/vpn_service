from datetime import datetime

from pydantic import BaseModel


class PlanResponse(BaseModel):
    id: int
    name: str
    duration_days: int
    price_rub: float
    traffic_gb: int | None

    model_config = {"from_attributes": True}


class SubscriptionResponse(BaseModel):
    id: int
    plan: PlanResponse
    started_at: datetime
    ends_at: datetime
    is_active: bool
    traffic_gb: int | None

    model_config = {"from_attributes": True}


class AggregatedSubResponse(BaseModel):
    sub_url: str


class ServerConfigResponse(BaseModel):
    server_name: str
    server_location: str
    flag_emoji: str | None
    sub_link: str | None
    vpn_uuid: str

    model_config = {"from_attributes": True}
