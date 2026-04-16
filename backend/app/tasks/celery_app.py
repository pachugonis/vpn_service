import asyncio
import logging
from datetime import datetime, timedelta

from celery import Celery
from celery.schedules import crontab
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session
from app.models.server import Server
from app.models.subscription import Subscription
from app.models.user import User
from app.services.xui import XUIClient, XUIServer
from app.services.xui_manager import remove_client_from_all_servers

logger = logging.getLogger(__name__)

celery_app = Celery("vpn_shop", broker=settings.REDIS_URL)

celery_app.conf.beat_schedule = {
    "expire-subscriptions": {
        "task": "app.tasks.celery_app.expire_subscriptions",
        "schedule": crontab(hour=3, minute=0),
    },
    "check-servers-health": {
        "task": "app.tasks.celery_app.check_servers_health",
        "schedule": 300.0,
    },
    "send-renewal-reminders": {
        "task": "app.tasks.celery_app.send_renewal_reminders",
        "schedule": crontab(hour=10, minute=0),
    },
}
celery_app.conf.timezone = "UTC"


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task
def expire_subscriptions():
    run_async(_expire_subscriptions())


async def _expire_subscriptions():
    async with async_session() as db:
        result = await db.execute(
            select(Subscription)
            .where(Subscription.is_active == True, Subscription.ends_at < datetime.utcnow())
        )
        expired_subs = result.scalars().all()

        for sub in expired_subs:
            user = await db.get(User, sub.user_id)
            if user and user.vpn_uuid:
                await remove_client_from_all_servers(str(user.vpn_uuid), db)

            sub.is_active = False
            if user:
                has_other_active = await db.execute(
                    select(Subscription).where(
                        Subscription.user_id == user.id,
                        Subscription.is_active == True,
                        Subscription.id != sub.id,
                    )
                )
                if not has_other_active.scalar_one_or_none():
                    user.is_active = False

        await db.commit()
        logger.info("Expired %d subscriptions", len(expired_subs))


@celery_app.task
def check_servers_health():
    run_async(_check_servers_health())


async def _check_servers_health():
    async with async_session() as db:
        result = await db.execute(select(Server))
        servers = result.scalars().all()

        for server in servers:
            client = XUIClient(
                XUIServer(
                    name=server.name,
                    url=server.url,
                    username=server.username,
                    password=server.password,
                    inbound_id=server.inbound_id,
                )
            )
            try:
                await client._ensure_auth()
                if not server.is_active:
                    server.is_active = True
                    logger.info("Server %s is back online", server.name)

                # Fetch active clients count
                try:
                    server.online_clients = await client.get_inbound_clients_count()
                except Exception as e:
                    logger.warning("Failed to get clients count for %s: %s", server.name, e)

                # Fetch system stats (CPU, memory)
                try:
                    status = await client.get_server_status()
                    cpu = status.get("cpu", 0)
                    mem = status.get("mem", {})
                    mem_current = mem.get("current", 0) if isinstance(mem, dict) else 0
                    mem_total = mem.get("total", 1) if isinstance(mem, dict) else 1
                    server.cpu_usage = round(cpu, 1)
                    server.mem_usage = round(mem_current / mem_total * 100, 1) if mem_total else 0
                    server.load_pct = int(max(server.cpu_usage, server.mem_usage))
                except Exception as e:
                    logger.warning("Failed to get server status for %s: %s", server.name, e)

            except Exception as e:
                if server.is_active:
                    server.is_active = False
                    logger.warning("Server %s is down: %s", server.name, e)

        await db.commit()


@celery_app.task
def send_renewal_reminders():
    run_async(_send_renewal_reminders())


async def _send_renewal_reminders():
    async with async_session() as db:
        threshold = datetime.utcnow() + timedelta(days=3)
        result = await db.execute(
            select(Subscription).where(
                Subscription.is_active == True,
                Subscription.ends_at <= threshold,
                Subscription.ends_at > datetime.utcnow(),
            )
        )
        subs = result.scalars().all()
        for sub in subs:
            user = await db.get(User, sub.user_id)
            if user:
                logger.info(
                    "Renewal reminder: user %s (%s), expires %s",
                    user.id,
                    user.email,
                    sub.ends_at,
                )
                # TODO: implement email sending
