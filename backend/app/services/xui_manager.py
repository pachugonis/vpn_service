import asyncio
import logging

from sqlalchemy import insert, select
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
    Always persist a UserServerConfig row so the dashboard has something
    to show."""
    servers = await get_all_active_servers(db)

    async def sync_server(server: Server) -> dict:
        client = _make_client(server)
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

        sub_link = client.get_sub_link(vpn_uuid)
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
