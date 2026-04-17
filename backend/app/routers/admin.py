import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Payment
from app.models.subscription import Subscription
from app.models.user_server_config import UserServerConfig


from app.auth import require_admin
from app.database import get_db
from app.models.plan import Plan
from app.models.server import Server
from app.models.site_settings import SiteSettings
from app.models.user import User
from app.schemas.admin import (
    PlanAdminResponse,
    PlanCreate,
    PlanUpdate,
    ServerAdminResponse,
    ServerCreate,
    ServerTestConnection,
    ServerTestResult,
    ServerUpdate,
    SiteSettingsResponse,
    SiteSettingsUpdate,
    UserAdminResponse,
    UserAssignPlan,
    UserUpdate,
)
from app.services.subscription import activate_subscription
from app.services.xui_manager import remove_client_from_all_servers, sync_all_users_to_server
from app.services.xui import XUIClient, XUIServer


async def _get_or_create_settings(db: AsyncSession) -> SiteSettings:
    obj = await db.get(SiteSettings, 1)
    if not obj:
        obj = SiteSettings(id=1, maintenance_mode=False)
        db.add(obj)
        await db.commit()
        await db.refresh(obj)
    return obj

router = APIRouter(dependencies=[Depends(require_admin)])


# ---------- Servers ----------

logger = logging.getLogger(__name__)


@router.get("/servers", response_model=list[ServerAdminResponse])
async def list_servers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).order_by(Server.id))
    servers = result.scalars().all()

    # Fetch live stats from each active server in parallel
    async def _update_stats(server: Server) -> None:
        if not server.is_active:
            return
        try:
            client = XUIClient(
                XUIServer(
                    name=server.name,
                    url=server.url,
                    username=server.username,
                    password=server.password,
                    inbound_id=server.inbound_id,
                )
            )
            stats = await client.get_server_stats()
            server.online_clients = stats.get("online_clients", 0)
            cpu = stats.get("cpu", 0)
            if isinstance(cpu, list):
                cpu = sum(cpu) / len(cpu) if cpu else 0.0
            server.cpu_usage = round(float(cpu or 0), 1)
            mem = stats.get("mem", {})
            mem_current = mem.get("current", 0) if isinstance(mem, dict) else 0
            mem_total = mem.get("total", 1) if isinstance(mem, dict) else 1
            server.mem_usage = round(mem_current / mem_total * 100, 1) if mem_total else 0
        except Exception as e:
            logger.warning("Failed to fetch stats for %s: %s", server.name, e)

    await asyncio.gather(*[_update_stats(s) for s in servers])
    await db.commit()

    return servers


@router.post("/servers/test-connection", response_model=ServerTestResult)
async def test_server_connection(data: ServerTestConnection):
    client = XUIClient(
        XUIServer(
            name="test",
            url=data.url.rstrip("/"),
            username=data.username,
            password=data.password,
            inbound_id=data.inbound_id,
        )
    )
    ok, message = await client.test_connection()
    return ServerTestResult(ok=ok, message=message)


@router.post("/servers", response_model=ServerAdminResponse, status_code=201)
async def create_server(data: ServerCreate, db: AsyncSession = Depends(get_db)):
    server = Server(**data.model_dump())
    db.add(server)
    await db.commit()
    await db.refresh(server)

    if server.is_active:
        try:
            await sync_all_users_to_server(server, db)
        except Exception:
            pass

    return server


@router.patch("/servers/{server_id}", response_model=ServerAdminResponse)
async def update_server(server_id: int, data: ServerUpdate, db: AsyncSession = Depends(get_db)):
    server = await db.get(Server, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    was_active = server.is_active
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(server, k, v)
    await db.commit()
    await db.refresh(server)

    if server.is_active and not was_active:
        try:
            await sync_all_users_to_server(server, db)
        except Exception:
            pass

    return server


@router.delete("/servers/{server_id}", status_code=204)
async def delete_server(server_id: int, db: AsyncSession = Depends(get_db)):
    server = await db.get(Server, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    await db.execute(
        delete(UserServerConfig).where(UserServerConfig.server_id == server_id)
    )
    await db.delete(server)
    await db.commit()


# ---------- Plans ----------

@router.get("/plans", response_model=list[PlanAdminResponse])
async def list_plans(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Plan).order_by(Plan.id))
    return result.scalars().all()


@router.post("/plans", response_model=PlanAdminResponse, status_code=201)
async def create_plan(data: PlanCreate, db: AsyncSession = Depends(get_db)):
    payload = data.model_dump()
    plan = Plan(**payload)
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.patch("/plans/{plan_id}", response_model=PlanAdminResponse)
async def update_plan(plan_id: int, data: PlanUpdate, db: AsyncSession = Depends(get_db)):
    plan = await db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    updates = data.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(plan, k, v)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.delete("/plans/{plan_id}", status_code=204)
async def delete_plan(plan_id: int, db: AsyncSession = Depends(get_db)):
    plan = await db.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    await db.delete(plan)
    await db.commit()


# ---------- Users ----------

@router.get("/users", response_model=list[UserAdminResponse])
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.id))
    return result.scalars().all()


@router.patch("/users/{user_id}", response_model=UserAdminResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(user, k, v)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/users/{user_id}/assign-plan", status_code=204)
async def assign_plan_to_user(
    user_id: int,
    data: UserAssignPlan,
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    plan = await db.get(Plan, data.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    await activate_subscription(user_id, data.plan_id, db)
    await db.commit()


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(require_admin),
):
    if user_id == current.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.vpn_uuid:
        try:
            await remove_client_from_all_servers(str(user.vpn_uuid), db)
        except Exception:
            pass

    await db.execute(delete(UserServerConfig).where(UserServerConfig.user_id == user_id))
    await db.execute(delete(Subscription).where(Subscription.user_id == user_id))
    await db.execute(delete(Payment).where(Payment.user_id == user_id))
    await db.delete(user)
    await db.commit()


# ---------- Site settings ----------

@router.get("/settings", response_model=SiteSettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):
    return await _get_or_create_settings(db)


@router.patch("/settings", response_model=SiteSettingsResponse)
async def update_settings(data: SiteSettingsUpdate, db: AsyncSession = Depends(get_db)):
    obj = await _get_or_create_settings(db)
    obj.maintenance_mode = data.maintenance_mode
    await db.commit()
    await db.refresh(obj)
    return obj
