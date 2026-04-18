import asyncio
import base64
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.server import Server
from app.models.user import User
from app.models.user_server_config import UserServerConfig
from app.services.vless_uri import build_vless_uri, host_from_url
from app.services.xui import XUIClient, XUIServer

logger = logging.getLogger(__name__)

router = APIRouter()


def _try_decode(text: str) -> str:
    stripped = "".join(text.split())
    try:
        decoded = base64.b64decode(stripped, validate=False).decode("utf-8", errors="ignore")
        if "://" in decoded:
            return decoded
    except Exception:
        pass
    return text


async def _fetch_sub(client: httpx.AsyncClient, url: str) -> str:
    try:
        resp = await client.get(url, timeout=8.0)
        if resp.status_code != 200:
            logger.warning("sub fetch %s -> %s", url, resp.status_code)
            return ""
        return _try_decode(resp.text)
    except Exception as e:
        logger.warning("sub fetch %s failed: %s", url, e)
        return ""


async def _uri_from_inbound(server: Server, vpn_uuid: str) -> str | None:
    """Build a VLESS URI by querying the 3x-ui panel API directly. More
    reliable than the optional /sub/ service which requires per-server
    path configuration."""
    xui_client = XUIClient(
        XUIServer(
            name=server.name,
            url=server.url,
            username=server.username,
            password=server.password,
            inbound_id=server.inbound_id,
        )
    )
    try:
        inbound = await xui_client.get_inbound()
    except Exception as e:
        logger.warning("get_inbound failed on %s: %s", server.name, e)
        return None

    host = host_from_url(server.url)
    remark = server.name or host
    uri = build_vless_uri(inbound, vpn_uuid, host, remark)
    if not uri:
        logger.warning(
            "could not build VLESS URI for %s (protocol=%s)",
            server.name,
            inbound.get("protocol"),
        )
    return uri


@router.get("/subkakovo/{vpn_uuid}")
async def aggregated_sub(vpn_uuid: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.vpn_uuid == vpn_uuid)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Not found")

    cfg_result = await db.execute(
        select(UserServerConfig, Server)
        .join(Server, Server.id == UserServerConfig.server_id)
        .where(UserServerConfig.user_id == user.id, Server.is_active == True)
    )
    rows = list(cfg_result.all())

    async def resolve(cfg: UserServerConfig, server: Server) -> list[str]:
        uri = await _uri_from_inbound(server, vpn_uuid)
        if uri:
            return [uri]
        if cfg.sub_link:
            async with httpx.AsyncClient(verify=False) as client:
                chunk = await _fetch_sub(client, cfg.sub_link)
            return [
                line.strip()
                for line in chunk.splitlines()
                if line.strip() and "://" in line
            ]
        return []

    results = await asyncio.gather(*[resolve(cfg, srv) for cfg, srv in rows])

    lines: list[str] = []
    seen: set[str] = set()
    for chunk_lines in results:
        for line in chunk_lines:
            if line in seen:
                continue
            seen.add(line)
            lines.append(line)

    body = base64.b64encode(("\n".join(lines) + "\n").encode()).decode()
    return Response(
        content=body,
        media_type="text/plain; charset=utf-8",
        headers={"Profile-Title": "VPN Kakovo"},
    )
