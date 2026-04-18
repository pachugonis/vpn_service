"""End-to-end test of the 5 flows the spec calls out:

1. Purchase → client synced to every server without 3x-ui/DB conflicts.
2. Delete user → clients removed from all panels (including inactive), DB wiped.
3. Add server → all active subscribers provisioned onto it sequentially.
4. Delete server → UserServerConfig rows removed; clients purged from panel.
5. Admin assign-plan → same guarantees as a purchase.

Uses a real PostgreSQL (container) so the on_conflict_do_update path is
exercised faithfully. The 3x-ui API is replaced with an in-memory fake that
mimics the non-atomic addClient/updateClient semantics (rewriting the whole
clients array) and also catches parallel-write races so the per-server lock
is genuinely under test.
"""

import asyncio
import os
import sys
import uuid

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://test:test@localhost:55432/vpnshop_test",
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("SECRET_KEY", "x")
os.environ.setdefault("FRONTEND_URL", "https://vpn.test")
# Disable SMTP so tests don't spam a real server.
os.environ["SMTP_HOST"] = ""
os.environ["SMTP_USER"] = ""

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from datetime import datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base
from app.models.plan import Plan
from app.models.server import Server
from app.models.subscription import Subscription
from app.models.user import User
from app.models.user_server_config import UserServerConfig
from app.services import xui_manager
from app.services.subscription import activate_subscription


# ---------- In-memory fake 3x-ui panel ----------


class FakePanel:
    """Mimics a single 3x-ui inbound: one clients list, non-atomic writes."""

    def __init__(self, name: str):
        self.name = name
        self.clients: dict[str, dict] = {}
        self.in_flight = 0
        self.max_in_flight = 0

    async def _simulate_write(self):
        self.in_flight += 1
        self.max_in_flight = max(self.max_in_flight, self.in_flight)
        try:
            # Yield so overlapping writes can be observed
            await asyncio.sleep(0.005)
        finally:
            self.in_flight -= 1


class FakeXUIClient:
    def __init__(self, server):
        self.server = server
        self.panel = _panels.setdefault(server.name, FakePanel(server.name))

    async def _ensure_auth(self):
        return None

    async def add_client(self, vpn_uuid, email, expire_days, traffic_gb=0):
        await self.panel._simulate_write()
        if vpn_uuid in self.panel.clients:
            # 3x-ui returns success=False with a duplicate message
            raise RuntimeError(f"3x-ui addClient failed on {self.server.name}: duplicate")
        self.panel.clients[vpn_uuid] = {
            "id": vpn_uuid,
            "email": email,
            "expire_days": expire_days,
            "traffic_gb": traffic_gb,
        }
        return {"success": True}

    async def update_client(self, vpn_uuid, email, expire_days, traffic_gb=0):
        await self.panel._simulate_write()
        self.panel.clients[vpn_uuid] = {
            "id": vpn_uuid,
            "email": email,
            "expire_days": expire_days,
            "traffic_gb": traffic_gb,
        }
        return {"success": True}

    async def delete_client(self, vpn_uuid):
        await self.panel._simulate_write()
        self.panel.clients.pop(vpn_uuid, None)
        return {"success": True}


_panels: dict[str, FakePanel] = {}


# ---------- Test harness ----------


engine = create_async_engine(os.environ["DATABASE_URL"], echo=False)
Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def reset_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    _panels.clear()


def make_server(name: str, sid: int, active: bool = True) -> Server:
    return Server(
        id=sid,
        name=name,
        location=name.lower(),
        url=f"https://{name.lower()}.test",
        sub_url=f"https://{name.lower()}.test",
        username="admin",
        password="pw",
        inbound_id=1,
        is_active=active,
    )


async def seed_servers(db: AsyncSession, names: list[tuple[str, bool]]):
    for i, (n, active) in enumerate(names, start=1):
        db.add(make_server(n, i, active))
        # Pre-create the fake panel so tests can assert on inactive ones too.
        _panels.setdefault(n, FakePanel(n))
    await db.commit()


async def make_user(db, email: str) -> User:
    u = User(email=email, password_hash="x", vpn_uuid=uuid.uuid4(), is_active=True)
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


async def make_plan(db) -> Plan:
    p = Plan(
        name="1m", duration_days=30,
        price_rub=100, price_usd=1, traffic_gb=0, is_active=True,
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


def configs_for(db_session_rows: list) -> dict[str, set[str]]:
    """server_name -> {vpn_uuid, …}"""
    out: dict[str, set[str]] = {}
    for cfg, server_name in db_session_rows:
        out.setdefault(server_name, set()).add(str(cfg.vpn_uuid))
    return out


# Patch the factory ONCE so every xui_manager helper uses the fake client.
xui_manager._make_client = lambda server: FakeXUIClient(server)


# ---------- Individual flow tests ----------


async def test_purchase_flow():
    await reset_db()
    async with Session() as db:
        await seed_servers(db, [("DE", True), ("NL", True), ("FI", True)])
        user = await make_user(db, "buyer@test")
        plan = await make_plan(db)
        await activate_subscription(user.id, plan.id, db)
        await db.commit()

        configs = (await db.execute(select(UserServerConfig))).scalars().all()
        assert len(configs) == 3, f"expected 3 configs, got {len(configs)}"
        assert all(c.sub_link and "subkakovo" in c.sub_link for c in configs)

    for name in ("DE", "NL", "FI"):
        panel = _panels[name]
        assert len(panel.clients) == 1, f"{name} should have 1 client, got {len(panel.clients)}"
        assert panel.max_in_flight == 1, f"{name} had concurrent writes"
    print("  OK purchase flow: 3 configs persisted, no panel races")


async def test_concurrent_purchases_same_panel():
    """Two users buying at once must NOT race on a single panel."""
    await reset_db()
    async with Session() as db:
        await seed_servers(db, [("DE", True), ("NL", True)])
        plan = await make_plan(db)
        users = []
        for i in range(5):
            users.append(await make_user(db, f"buyer{i}@test"))

    async def buy(uid, pid):
        async with Session() as db:
            await activate_subscription(uid, pid, db)
            await db.commit()

    await asyncio.gather(*[buy(u.id, plan.id) for u in users])

    for name in ("DE", "NL"):
        panel = _panels[name]
        assert len(panel.clients) == 5, f"{name} dropped entries: {len(panel.clients)}/5"
        assert panel.max_in_flight == 1, f"{name} saw {panel.max_in_flight} concurrent writes"

    async with Session() as db:
        configs = (await db.execute(select(UserServerConfig))).scalars().all()
        assert len(configs) == 5 * 2, f"expected 10 configs, got {len(configs)}"
    print("  OK 5 concurrent purchases × 2 servers: no races, no drops")


async def test_delete_user_cleans_all_servers():
    await reset_db()
    async with Session() as db:
        # Include one inactive server to prove delete still hits it.
        await seed_servers(db, [("DE", True), ("NL", True), ("FI", False)])
        user = await make_user(db, "victim@test")
        plan = await make_plan(db)
        await activate_subscription(user.id, plan.id, db)
        await db.commit()

        # Simulate FI having a stale client that predates its deactivation.
        _panels["FI"].clients[str(user.vpn_uuid)] = {"id": str(user.vpn_uuid)}

        await xui_manager.remove_client_everywhere(str(user.vpn_uuid), db)
        await db.execute(delete(UserServerConfig).where(UserServerConfig.user_id == user.id))
        await db.execute(delete(Subscription).where(Subscription.user_id == user.id))
        await db.delete(user)
        await db.commit()

        remaining = (await db.execute(select(UserServerConfig))).scalars().all()
        assert remaining == [], f"DB configs not wiped: {remaining}"

    for name in ("DE", "NL", "FI"):
        assert _panels[name].clients == {}, f"{name} still has clients: {_panels[name].clients}"
    print("  OK delete user: DE/NL/FI (incl. inactive) all cleaned")


async def test_add_server_syncs_existing_subscribers():
    await reset_db()
    async with Session() as db:
        await seed_servers(db, [("DE", True)])
        plan = await make_plan(db)
        users = [await make_user(db, f"u{i}@test") for i in range(3)]
        for u in users:
            await activate_subscription(u.id, plan.id, db)
        await db.commit()

        # Now an admin adds a new server.
        nl = make_server("NL", 2, active=True)
        db.add(nl)
        await db.commit()
        await db.refresh(nl)
        results = await xui_manager.sync_all_users_to_server(nl, db)

        assert all(r["status"] == "ok" for r in results), f"sync failures: {results}"
        assert len(_panels["NL"].clients) == 3, _panels["NL"].clients
        assert _panels["NL"].max_in_flight == 1, "parallel writes on new server"

        configs = (await db.execute(
            select(UserServerConfig).where(UserServerConfig.server_id == nl.id)
        )).scalars().all()
        assert len(configs) == 3
    print("  OK add server: 3 subscribers synced sequentially, 3 configs persisted")


async def test_delete_server_removes_configs_and_clients():
    await reset_db()
    async with Session() as db:
        await seed_servers(db, [("DE", True), ("NL", True)])
        plan = await make_plan(db)
        users = [await make_user(db, f"u{i}@test") for i in range(2)]
        for u in users:
            await activate_subscription(u.id, plan.id, db)
        await db.commit()

        nl = (await db.execute(select(Server).where(Server.name == "NL"))).scalar_one()
        await xui_manager.remove_all_users_from_server(nl, db)
        await db.execute(delete(UserServerConfig).where(UserServerConfig.server_id == nl.id))
        await db.delete(nl)
        await db.commit()

        remaining = (await db.execute(
            select(UserServerConfig).where(UserServerConfig.server_id == nl.id)
        )).scalars().all()
        assert remaining == []

    assert _panels["NL"].clients == {}, _panels["NL"].clients
    assert len(_panels["DE"].clients) == 2
    print("  OK delete server: NL configs + clients gone, DE untouched")


async def test_admin_assign_plan_equivalent_to_purchase():
    await reset_db()
    async with Session() as db:
        await seed_servers(db, [("DE", True), ("NL", True), ("FI", True)])
        user = await make_user(db, "vip@test")
        plan = await make_plan(db)
        # Mirror the admin endpoint: activate_subscription + final commit.
        await activate_subscription(user.id, plan.id, db)
        await db.commit()

        configs = (await db.execute(
            select(UserServerConfig).where(UserServerConfig.user_id == user.id)
        )).scalars().all()
        assert len(configs) == 3

        sub = (await db.execute(
            select(Subscription).where(Subscription.user_id == user.id)
        )).scalar_one()
        assert sub.is_active
        assert sub.ends_at > datetime.utcnow() + timedelta(days=29)

    for name in ("DE", "NL", "FI"):
        assert len(_panels[name].clients) == 1
    print("  OK admin assign-plan: 3 configs, 1 subscription, no conflicts")


async def test_upsert_refreshes_sub_link():
    """If a server's sub_url changes, re-sync must refresh the stored sub_link
    (previously on_conflict_do_nothing left it stale)."""
    await reset_db()
    async with Session() as db:
        await seed_servers(db, [("DE", True)])
        user = await make_user(db, "renew@test")
        plan = await make_plan(db)
        await activate_subscription(user.id, plan.id, db)
        await db.commit()

        de = (await db.execute(select(Server).where(Server.name == "DE"))).scalar_one()
        de.sub_url = "https://de2.test"
        await db.commit()

        # Re-sync — upsert must overwrite sub_link.
        await xui_manager.sync_client_to_all_servers(
            user_id=user.id,
            vpn_uuid=str(user.vpn_uuid),
            email=user.email,
            expire_days=30,
            traffic_gb=0,
            db=db,
        )

    # Read back in a fresh session so the ORM identity map can't serve
    # a cached row from before the upsert.
    async with Session() as fresh:
        cfg = (await fresh.execute(
            select(UserServerConfig).where(UserServerConfig.user_id == user.id)
        )).scalar_one()
        assert "de2.test" in cfg.sub_link, f"stale sub_link: {cfg.sub_link}"
    print("  OK upsert refreshes sub_link after URL change")


async def main():
    print("Running sync-flow tests…")
    await test_purchase_flow()
    await test_concurrent_purchases_same_panel()
    await test_delete_user_cleans_all_servers()
    await test_add_server_syncs_existing_subscribers()
    await test_delete_server_removes_configs_and_clients()
    await test_admin_assign_plan_equivalent_to_purchase()
    await test_upsert_refreshes_sub_link()
    print("All tests passed.")


if __name__ == "__main__":
    asyncio.run(main())
