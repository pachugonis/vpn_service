import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.server import Server
from app.models.user_server_config import UserServerConfig
from app.services.xui import XUIClient, XUIServer

logger = logging.getLogger(__name__)


async def get_all_active_servers(db: AsyncSession) -> list[Server]:
    result = await db.execute(select(Server).where(Server.is_active == True))
    return list(result.scalars().all())


def _make_client(server: Server) -> XUIClient:
    return XUIClient(
        XUIServer(
            name=server.name,
            url=server.url,
            username=server.username,
            password=server.password,
            inbound_id=server.inbound_id,
        )
    )


async def sync_client_to_all_servers(
    user_id: int,
    vpn_uuid: str,
    email: str,
    expire_days: int,
    traffic_gb: int = 0,
    db: AsyncSession = None,
) -> list[dict]:
    """Upsert the client on every active server: try addClient; if 3x-ui
    reports it already exists, fall back to updateClient (full payload).
    UserServerConfig is persisted only when the 3x-ui call actually
    succeeded — otherwise the dashboard would advertise a sub_link that
    does not resolve on the server."""
    servers = await get_all_active_servers(db)

    async def sync_server(server: Server) -> dict:
        client = _make_client(server)
        try:
            await client._ensure_auth()
        except Exception as e:
            logger.error("Login failed for %s: %s", server.name, e)
            return {"server": server.name, "status": "error", "error": f"login: {e}"}

        status = "ok"
        error: str | None = None
        try:
            try:
                await client.add_client(vpn_uuid, email, expire_days, traffic_gb)
            except Exception as add_err:
                logger.info(
                    "addClient on %s failed (%s), trying updateClient",
                    server.name,
                    add_err,
                )
                await client.update_client(vpn_uuid, email, expire_days, traffic_gb)
        except Exception as e:
            status = "error"
            error = str(e)
            logger.error("Failed to sync client on %s: %s", server.name, e)

        if status == "ok":
            sub_base = (server.sub_url or server.url).rstrip("/")
            sub_link = f"{sub_base}/subkakovo/{vpn_uuid}"
            try:
                await db.execute(
                    insert(UserServerConfig)
                    .values(
                        user_id=user_id,
                        server_id=server.id,
                        vpn_uuid=vpn_uuid,
                        sub_link=sub_link,
                    )
                    .on_conflict_do_nothing()
                )
            except Exception as e:
                logger.error("Failed to persist UserServerConfig for %s: %s", server.name, e)

        return {"server": server.name, "status": status, "error": error}

    results = await asyncio.gather(*[sync_server(s) for s in servers])
    await db.commit()
    return list(results)


# Back-compat alias
add_client_to_all_servers = sync_client_to_all_servers


async def remove_client_from_all_servers(vpn_uuid: str, db: AsyncSession) -> list[dict]:
    servers = await get_all_active_servers(db)

    async def remove_from_server(server: Server) -> dict:
        client = _make_client(server)
        try:
            await client.delete_client(vpn_uuid)
            return {"server": server.name, "status": "ok"}
        except Exception as e:
            logger.error("Failed to remove client from %s: %s", server.name, e)
            return {"server": server.name, "status": "error", "error": str(e)}

    return list(await asyncio.gather(*[remove_from_server(s) for s in servers]))


async def sync_all_users_to_server(server: Server, db: AsyncSession) -> list[dict]:
    """Provision every user with an active subscription onto a single server.
    Used when a new server is added so existing subscribers get a config
    without manual intervention."""
    from datetime import datetime

    from app.models.subscription import Subscription
    from app.models.user import User

    result = await db.execute(
        select(User, Subscription)
        .join(Subscription, Subscription.user_id == User.id)
        .where(
            Subscription.is_active == True,
            Subscription.ends_at > datetime.utcnow(),
            User.vpn_uuid.is_not(None),
        )
    )
    rows = result.all()

    client = _make_client(server)
    try:
        await client._ensure_auth()
    except Exception as e:
        logger.error("Login failed for %s, cannot sync users: %s", server.name, e)
        return [
            {"user_id": u.id, "status": "error", "error": f"login: {e}"}
            for u, _ in rows
        ]

    async def sync_user(user: User, sub: Subscription) -> dict:
        expire_days = max(1, (sub.ends_at - datetime.utcnow()).days)
        vpn_uuid = str(user.vpn_uuid)
        status = "ok"
        error: str | None = None
        try:
            try:
                await client.add_client(vpn_uuid, user.email, expire_days, sub.traffic_gb or 0)
            except Exception as add_err:
                logger.info(
                    "addClient on %s failed (%s), trying updateClient",
                    server.name,
                    add_err,
                )
                await client.update_client(
                    vpn_uuid, user.email, expire_days, sub.traffic_gb or 0
                )
        except Exception as e:
            status = "error"
            error = str(e)
            logger.error("Failed to sync user %s on %s: %s", user.id, server.name, e)

        if status == "ok":
            sub_base = (server.sub_url or server.url).rstrip("/")
            sub_link = f"{sub_base}/subkakovo/{vpn_uuid}"
            try:
                await db.execute(
                    insert(UserServerConfig)
                    .values(
                        user_id=user.id,
                        server_id=server.id,
                        vpn_uuid=vpn_uuid,
                        sub_link=sub_link,
                    )
                    .on_conflict_do_nothing()
                )
            except Exception as e:
                logger.error(
                    "Failed to persist UserServerConfig for user %s on %s: %s",
                    user.id,
                    server.name,
                    e,
                )
        return {"user_id": user.id, "status": status, "error": error}

    results = await asyncio.gather(*[sync_user(u, s) for u, s in rows])
    await db.commit()
    return list(results)


async def update_expiry_on_all_servers(
    vpn_uuid: str,
    email: str,
    expire_days: int,
    traffic_gb: int,
    db: AsyncSession,
) -> list[dict]:
    servers = await get_all_active_servers(db)

    async def update_server(server: Server) -> dict:
        client = _make_client(server)
        try:
            await client.update_client(vpn_uuid, email, expire_days, traffic_gb)
            return {"server": server.name, "status": "ok"}
        except Exception as e:
            logger.error("Failed to update client on %s: %s", server.name, e)
            return {"server": server.name, "status": "error", "error": str(e)}

    return list(await asyncio.gather(*[update_server(s) for s in servers]))
