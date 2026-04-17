from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.server import Server
from app.models.user import User
from app.models.user_server_config import UserServerConfig
from app.schemas.subscription import ServerConfigResponse

router = APIRouter()


@router.get("/public")
async def list_servers_public(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).where(Server.is_active == True))
    servers = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "location": s.location,
            "flag_emoji": s.flag_emoji,
            "load_pct": s.load_pct,
            "cpu_usage": s.cpu_usage,
            "mem_usage": s.mem_usage,
        }
        for s in servers
    ]


@router.get("/")
async def list_servers(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Active subscription required")

    result = await db.execute(select(Server).where(Server.is_active == True))
    servers = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "location": s.location,
            "flag_emoji": s.flag_emoji,
            "load_pct": s.load_pct,
        }
        for s in servers
    ]


@router.get("/{server_id}/config", response_model=ServerConfigResponse)
async def get_server_config(
    server_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Active subscription required")

    result = await db.execute(
        select(UserServerConfig).where(
            UserServerConfig.user_id == user.id,
            UserServerConfig.server_id == server_id,
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found for this server")

    return ServerConfigResponse(
        server_name=config.server.name,
        server_location=config.server.location,
        flag_emoji=config.server.flag_emoji,
        sub_link=config.sub_link,
    )
