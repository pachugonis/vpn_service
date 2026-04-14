import logging
import uuid
from datetime import datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.user import User
from app.services.xui_manager import (
    remove_client_from_all_servers,
    sync_client_to_all_servers,
)

logger = logging.getLogger(__name__)


async def get_active_subscription(user_id: int, db: AsyncSession) -> Subscription | None:
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == user_id,
            Subscription.is_active == True,
        )
    )
    return result.scalar_one_or_none()


async def activate_subscription(user_id: int, plan_id: int, db: AsyncSession):
    plan = await db.get(Plan, plan_id)
    user = await db.get(User, user_id)

    if not user or not plan:
        logger.error("activate_subscription: user=%s plan=%s not found", user_id, plan_id)
        return

    if not user.vpn_uuid:
        user.vpn_uuid = uuid.uuid4()
        db.add(user)
        await db.flush()

    existing_sub = await get_active_subscription(user_id, db)

    if existing_sub:
        existing_sub.ends_at += timedelta(days=plan.duration_days)
        remaining_days = max(1, (existing_sub.ends_at - datetime.utcnow()).days)
    else:
        ends_at = datetime.utcnow() + timedelta(days=plan.duration_days)
        existing_sub = Subscription(
            user_id=user_id,
            plan_id=plan_id,
            started_at=datetime.utcnow(),
            ends_at=ends_at,
            is_active=True,
            traffic_gb=plan.traffic_gb,
        )
        db.add(existing_sub)
        remaining_days = plan.duration_days

    user.is_active = True
    db.add(user)
    await db.flush()

    await sync_client_to_all_servers(
        user_id=user_id,
        vpn_uuid=str(user.vpn_uuid),
        email=user.email,
        expire_days=remaining_days,
        traffic_gb=plan.traffic_gb or 0,
        db=db,
    )
    logger.info("Subscription activated for user %s, plan %s", user_id, plan_id)


async def revoke_subscription(user_id: int, db: AsyncSession):
    user = await db.get(User, user_id)
    if not user:
        return

    if user.vpn_uuid:
        await remove_client_from_all_servers(str(user.vpn_uuid), db)

    user.is_active = False
    db.add(user)

    await db.execute(
        update(Subscription)
        .where(Subscription.user_id == user_id, Subscription.is_active == True)
        .values(is_active=False)
    )
    logger.info("Subscription revoked for user %s", user_id)
