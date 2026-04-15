import asyncio
import base64
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.user_server_config import UserServerConfig

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


async def _fetch(client: httpx.AsyncClient, url: str) -> str:
    try:
        resp = await client.get(url, timeout=8.0)
        if resp.status_code != 200:
            logger.warning("sub fetch %s -> %s", url, resp.status_code)
            return ""
        return _try_decode(resp.text)
    except Exception as e:
        logger.warning("sub fetch %s failed: %s", url, e)
        return ""


@router.get("/subkakovo/{vpn_uuid}")
async def aggregated_sub(vpn_uuid: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.vpn_uuid == vpn_uuid)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Not found")

    cfg_result = await db.execute(
        select(UserServerConfig).where(UserServerConfig.user_id == user.id)
    )
    configs = list(cfg_result.scalars().all())
    urls = [c.sub_link for c in configs if c.sub_link]

    lines: list[str] = []
    seen: set[str] = set()
    if urls:
        async with httpx.AsyncClient(verify=False) as client:
            chunks = await asyncio.gather(*(_fetch(client, u) for u in urls))
        for chunk in chunks:
            for line in chunk.splitlines():
                line = line.strip()
                if not line or "://" not in line or line in seen:
                    continue
                seen.add(line)
                lines.append(line)

    body = base64.b64encode(("\n".join(lines) + "\n").encode()).decode()
    return Response(
        content=body,
        media_type="text/plain; charset=utf-8",
        headers={"Profile-Title": "VPN Kakovo"},
    )
