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


async def add_client_to_all_servers(
    user_id: int,
    vpn_uuid: str,
    email: str,
    expire_days: int,
    traffic_gb: int = 0,
    db: AsyncSession = None,
) -> list[dict]:
    servers = await get_all_active_servers(db)

    async def add_to_server(server: Server) -> dict:
        client = _make_client(server)
        try:
            await client.add_client(vpn_uuid, email, expire_days, traffic_gb)
            sub_link = client.get_sub_link(vpn_uuid)
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
            return {"server": server.name, "status": "ok"}
        except Exception as e:
            logger.error("Failed to add client to %s: %s", server.name, e)
            return {"server": server.name, "status": "error", "error": str(e)}

    results = await asyncio.gather(*[add_to_server(s) for s in servers])
    await db.commit()
    return list(results)


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


async def update_expiry_on_all_servers(vpn_uuid: str, expire_days: int, db: AsyncSession) -> list[dict]:
    servers = await get_all_active_servers(db)

    async def update_server(server: Server) -> dict:
        client = _make_client(server)
        try:
            await client.update_client_expiry(vpn_uuid, expire_days)
            return {"server": server.name, "status": "ok"}
        except Exception as e:
            logger.error("Failed to update expiry on %s: %s", server.name, e)
            return {"server": server.name, "status": "error", "error": str(e)}

    return list(await asyncio.gather(*[update_server(s) for s in servers]))
