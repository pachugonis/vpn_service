from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.user import User
from app.models.user_server_config import UserServerConfig
from app.schemas.subscription import (
    AggregatedSubResponse,
    PlanResponse,
    ServerConfigResponse,
    SubscriptionResponse,
)

router = APIRouter()


@router.get("/plans", response_model=list[PlanResponse])
async def get_plans(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Plan).where(Plan.is_active == True).order_by(Plan.duration_days))
    return result.scalars().all()


@router.get("/me", response_model=SubscriptionResponse | None)
async def get_my_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == user.id, Subscription.is_active == True)
        .order_by(Subscription.ends_at.desc())
    )
    sub = result.scalar_one_or_none()
    return sub


@router.get("/configs", response_model=list[ServerConfigResponse])
async def get_my_configs(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserServerConfig).where(UserServerConfig.user_id == user.id)
    )
    configs = result.scalars().all()
    return [
        ServerConfigResponse(
            server_name=c.server.name,
            server_location=c.server.location,
            flag_emoji=c.server.flag_emoji,
            sub_link=c.sub_link,
            vpn_uuid=str(c.vpn_uuid),
        )
        for c in configs
    ]


@router.get("/sub-url", response_model=AggregatedSubResponse)
async def get_my_sub_url(
    request: Request,
    user: User = Depends(get_current_user),
):
    if not user.vpn_uuid:
        raise HTTPException(status_code=404, detail="VPN UUID не назначен")
    base = str(request.base_url).rstrip("/")
    return AggregatedSubResponse(sub_url=f"{base}/subkakovo/{user.vpn_uuid}")
