import asyncio
import logging
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.server import Server
from app.models.user_server_config import UserServerConfig
from app.services.xui import XUIClient, XUIServer

logger = logging.getLogger(__name__)


# Per-panel lock registry. 3x-ui rewrites the whole inbound `clients` array on
# every add/update, so concurrent writes to the same panel race and silently
# drop entries. A single-process app guarantees this lock is authoritative;
# if we ever go multi-worker the same protection needs a Redis lock.
_server_locks: dict[int, asyncio.Lock] = defaultdict(asyncio.Lock)


def _lock_for(server_id: int) -> asyncio.Lock:
    return _server_locks[server_id]


async def get_all_active_servers(db: AsyncSession) -> list[Server]:
    result = await db.execute(select(Server).where(Server.is_active == True))
    return list(result.scalars().all())


async def _get_all_servers(db: AsyncSession) -> list[Server]:
    result = await db.execute(select(Server))
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


def _sub_link(server: Server, vpn_uuid: str) -> str:
    sub_base = (server.sub_url or server.url).rstrip("/")
    return f"{sub_base}/subkakovo/{vpn_uuid}"


async def _add_or_update_client(
    client: XUIClient,
    server_name: str,
    vpn_uuid: str,
    email: str,
    expire_days: int,
    traffic_gb: int,
) -> None:
    """addClient first (new users) then fall back to updateClient on conflict
    (existing users — renewals or re-syncs). 3x-ui returns success=False with
    a duplicate-id message when the client already lives in the inbound."""
    try:
        await client.add_client(vpn_uuid, email, expire_days, traffic_gb)
    except Exception as add_err:
        logger.info(
            "addClient on %s failed (%s), falling back to updateClient",
            server_name, add_err,
        )
        await client.update_client(vpn_uuid, email, expire_days, traffic_gb)


async def _upsert_user_server_config(
    db: AsyncSession,
    user_id: int,
    server: Server,
    vpn_uuid: str,
) -> None:
    stmt = insert(UserServerConfig).values(
        user_id=user_id,
        server_id=server.id,
        vpn_uuid=vpn_uuid,
        sub_link=_sub_link(server, vpn_uuid),
    )
    # Refresh vpn_uuid and sub_link on conflict so URL/uuid changes propagate.
    stmt = stmt.on_conflict_do_update(
        index_elements=["user_id", "server_id"],
        set_={"vpn_uuid": stmt.excluded.vpn_uuid, "sub_link": stmt.excluded.sub_link},
    )
    await db.execute(stmt)


async def sync_client_to_all_servers(
    user_id: int,
    vpn_uuid: str,
    email: str,
    expire_days: int,
    traffic_gb: int = 0,
    db: AsyncSession = None,
) -> list[dict]:
    """Provision/refresh the client on every active server. Safe under
    concurrent callers: each panel is serialized by its own lock.
    UserServerConfig is persisted only on 3x-ui success — the dashboard
    must never advertise a sub_link that doesn't resolve."""
    servers = await get_all_active_servers(db)

    async def sync_server(server: Server) -> dict:
        async with _lock_for(server.id):
            client = _make_client(server)
            try:
                await client._ensure_auth()
            except Exception as e:
                logger.error("Login failed for %s: %s", server.name, e)
                return {"server": server.name, "status": "error", "error": f"login: {e}"}

            try:
                await _add_or_update_client(
                    client, server.name, vpn_uuid, email, expire_days, traffic_gb
                )
            except Exception as e:
                logger.error("Failed to sync client on %s: %s", server.name, e)
                return {"server": server.name, "status": "error", "error": str(e)}

            try:
                await _upsert_user_server_config(db, user_id, server, vpn_uuid)
            except Exception as e:
                logger.error("Failed to persist UserServerConfig for %s: %s", server.name, e)
                return {"server": server.name, "status": "error", "error": f"db: {e}"}

            return {"server": server.name, "status": "ok"}

    results = await asyncio.gather(*[sync_server(s) for s in servers])
    await db.commit()
    return list(results)


async def remove_client_everywhere(vpn_uuid: str, db: AsyncSession) -> list[dict]:
    """Delete the VPN client on every server, active or not. Iterating only
    active servers leaves orphaned clients on panels that were temporarily
    marked inactive (e.g. by the health-check task)."""
    servers = await _get_all_servers(db)

    async def remove_from_server(server: Server) -> dict:
        async with _lock_for(server.id):
            client = _make_client(server)
            try:
                await client.delete_client(vpn_uuid)
                return {"server": server.name, "status": "ok"}
            except Exception as e:
                logger.error("Failed to remove client from %s: %s", server.name, e)
                return {"server": server.name, "status": "error", "error": str(e)}

    return list(await asyncio.gather(*[remove_from_server(s) for s in servers]))


async def remove_all_users_from_server(server: Server, db: AsyncSession) -> list[dict]:
    """Delete every UserServerConfig's client from a single server's 3x-ui
    panel. Used when a server is removed from the admin panel so that
    stale clients do not linger on the VPN node."""
    result = await db.execute(
        select(UserServerConfig.vpn_uuid).where(UserServerConfig.server_id == server.id)
    )
    uuids = [str(u) for u in result.scalars().all()]
    if not uuids:
        return []

    async with _lock_for(server.id):
        client = _make_client(server)
        try:
            await client._ensure_auth()
        except Exception as e:
            logger.error("Login failed for %s, cannot remove users: %s", server.name, e)
            return [
                {"vpn_uuid": u, "status": "error", "error": f"login: {e}"} for u in uuids
            ]

        results: list[dict] = []
        for vpn_uuid in uuids:
            try:
                await client.delete_client(vpn_uuid)
                results.append({"vpn_uuid": vpn_uuid, "status": "ok"})
            except Exception as e:
                logger.error("Failed to remove %s from %s: %s", vpn_uuid, server.name, e)
                results.append({"vpn_uuid": vpn_uuid, "status": "error", "error": str(e)})
        return results


async def sync_all_users_to_server(server: Server, db: AsyncSession) -> list[dict]:
    """Provision every active subscriber onto a single server. Used when a
    new server is added so existing subscribers get a config without manual
    intervention. Runs sequentially under the per-server lock — 3x-ui
    rewrites the whole clients array on each call, so parallel writes on
    one panel race and drop entries."""
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

    async with _lock_for(server.id):
        client = _make_client(server)
        try:
            await client._ensure_auth()
        except Exception as e:
            logger.error("Login failed for %s, cannot sync users: %s", server.name, e)
            return [
                {"user_id": u.id, "status": "error", "error": f"login: {e}"}
                for u, _ in rows
            ]

        results: list[dict] = []
        for user, sub in rows:
            expire_days = max(1, (sub.ends_at - datetime.utcnow()).days)
            vpn_uuid = str(user.vpn_uuid)
            try:
                await _add_or_update_client(
                    client, server.name, vpn_uuid, user.email,
                    expire_days, sub.traffic_gb or 0,
                )
            except Exception as e:
                logger.error("Failed to sync user %s on %s: %s", user.id, server.name, e)
                results.append({"user_id": user.id, "status": "error", "error": str(e)})
                continue

            try:
                await _upsert_user_server_config(db, user.id, server, vpn_uuid)
            except Exception as e:
                logger.error(
                    "Failed to persist UserServerConfig for user %s on %s: %s",
                    user.id, server.name, e,
                )
                results.append({"user_id": user.id, "status": "error", "error": f"db: {e}"})
                continue

            results.append({"user_id": user.id, "status": "ok"})

        await db.commit()
        return results


async def update_expiry_on_all_servers(
    vpn_uuid: str,
    email: str,
    expire_days: int,
    traffic_gb: int,
    db: AsyncSession,
) -> list[dict]:
    servers = await get_all_active_servers(db)

    async def update_server(server: Server) -> dict:
        async with _lock_for(server.id):
            client = _make_client(server)
            try:
                await client.update_client(vpn_uuid, email, expire_days, traffic_gb)
                return {"server": server.name, "status": "ok"}
            except Exception as e:
                logger.error("Failed to update client on %s: %s", server.name, e)
                return {"server": server.name, "status": "error", "error": str(e)}

    return list(await asyncio.gather(*[update_server(s) for s in servers]))
