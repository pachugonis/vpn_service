# CLAUDE.md — VPN Subscription Web App

Полная спецификация проекта для реализации через Claude Code.

---

## Цель проекта

Веб-приложение для продажи VPN-подписок на базе панели **3x-ui (Xray-core)**.
Пользователи покупают подписки, оплачивают картами РФ через **Platega.io** или биткоином через **BTCPay Server**, после чего автоматически получают доступ к VPN-серверам в нескольких локациях.

---

## Стек технологий

| Слой | Технология |
|------|-----------|
| Backend API | **FastAPI** (Python 3.11+) |
| База данных | **PostgreSQL** + **Redis** |
| ORM | **SQLAlchemy 2.0** (async) + **Alembic** |
| Очереди задач | **Celery** + Redis |
| Frontend | **Next.js 14** (App Router, TypeScript) |
| UI | **Tailwind CSS** + **shadcn/ui** |
| Контейнеризация | **Docker** + **Docker Compose** |
| Reverse proxy | **Nginx** + Let's Encrypt (Certbot) |
| Платежи 1 | **Platega.io** (карты РФ, СБП) |
| Платежи 2 | **BTCPay Server** (Bitcoin, Lightning) |
| VPN-панель | **3x-ui** на каждом VPS |

---

## Структура проекта

```
vpn-shop/
├── CLAUDE.md                  # этот файл
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── nginx/
│   ├── nginx.conf
│   └── ssl/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/
│   │   └── versions/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── server.py
│   │   │   ├── subscription.py
│   │   │   └── payment.py
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── subscription.py
│   │   │   └── payment.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── subscriptions.py
│   │   │   ├── payments.py
│   │   │   └── webhooks.py
│   │   ├── services/
│   │   │   ├── xui.py          # 3x-ui API клиент
│   │   │   ├── platega.py      # Platega.io интеграция
│   │   │   ├── btcpay.py       # BTCPay Server интеграция
│   │   │   └── subscription.py # логика подписок
│   │   └── tasks/
│   │       └── celery_app.py   # фоновые задачи
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── app/
        │   ├── page.tsx         # лендинг
        │   ├── pricing/
        │   ├── dashboard/
        │   ├── payment/
        │   │   ├── success/
        │   │   └── failed/
        │   └── auth/
        └── components/
            ├── PricingTable.tsx
            ├── ServerList.tsx
            └── ConfigDownload.tsx
```

---

## База данных — схема

### Таблица `users`
```sql
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    vpn_uuid      UUID UNIQUE,              -- единый UUID на всех серверах
    is_active     BOOLEAN DEFAULT false,
    created_at    TIMESTAMP DEFAULT NOW()
);
```

### Таблица `servers`
```sql
CREATE TABLE servers (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,      -- "Germany Frankfurt"
    location    VARCHAR(50) NOT NULL,       -- "de", "nl", "fi"
    flag_emoji  VARCHAR(10),               -- "🇩🇪"
    url         VARCHAR(255) NOT NULL,      -- "https://de.yourvpn.com:2053"
    username    VARCHAR(100) NOT NULL,      -- логин в 3x-ui
    password    VARCHAR(255) NOT NULL,      -- пароль в 3x-ui (шифровать!)
    inbound_id  INTEGER NOT NULL,           -- ID inbound в 3x-ui
    is_active   BOOLEAN DEFAULT true,
    load_pct    INTEGER DEFAULT 0           -- % загрузки, обновляется cron
);
```

### Таблица `plans`
```sql
CREATE TABLE plans (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,    -- "1 месяц", "3 месяца", "1 год"
    duration_days INTEGER NOT NULL,        -- 30, 90, 365
    price_rub    DECIMAL(10,2) NOT NULL,
    price_usd    DECIMAL(10,2) NOT NULL,
    traffic_gb   INTEGER,                  -- NULL = безлимит
    is_active    BOOLEAN DEFAULT true
);
```

### Таблица `subscriptions`
```sql
CREATE TABLE subscriptions (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER REFERENCES users(id),
    plan_id       INTEGER REFERENCES plans(id),
    started_at    TIMESTAMP NOT NULL,
    ends_at       TIMESTAMP NOT NULL,
    is_active     BOOLEAN DEFAULT true,
    traffic_gb    INTEGER,
    created_at    TIMESTAMP DEFAULT NOW()
);
```

### Таблица `user_server_configs`
```sql
CREATE TABLE user_server_configs (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id),
    server_id  INTEGER REFERENCES servers(id),
    vpn_uuid   UUID NOT NULL,
    sub_link   TEXT,                       -- ссылка подписки от 3x-ui
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, server_id)
);
```

### Таблица `payments`
```sql
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         INTEGER REFERENCES users(id),
    plan_id         INTEGER REFERENCES plans(id),
    provider        VARCHAR(20) NOT NULL,  -- 'platega' | 'btcpay'
    external_id     VARCHAR(255),          -- ID транзакции у провайдера
    amount          DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(10) NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending', -- pending|confirmed|canceled|chargebacked
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

---

## Сервис: 3x-ui API клиент (`services/xui.py`)

3x-ui предоставляет REST API. Авторизация — через сессионные куки.

```python
# app/services/xui.py
import httpx
import asyncio
from dataclasses import dataclass
from typing import Optional
import uuid as uuid_lib

@dataclass
class XUIServer:
    name: str
    url: str
    username: str
    password: str
    inbound_id: int

class XUIClient:
    def __init__(self, server: XUIServer):
        self.server = server
        self.base_url = server.url
        self._session_cookie: Optional[str] = None

    async def _login(self) -> str:
        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.post(
                f"{self.base_url}/login",
                json={
                    "username": self.server.username,
                    "password": self.server.password
                }
            )
            resp.raise_for_status()
            self._session_cookie = resp.cookies.get("3x-ui")
            return self._session_cookie

    def _get_headers(self) -> dict:
        return {"Cookie": f"3x-ui={self._session_cookie}"}

    async def add_client(
        self,
        vpn_uuid: str,
        email: str,            # уникальный идентификатор в 3x-ui
        expire_days: int = 30,
        traffic_gb: int = 0    # 0 = безлимит
    ) -> dict:
        if not self._session_cookie:
            await self._login()

        expire_ms = expire_days * 24 * 60 * 60 * 1000 if expire_days else 0
        traffic_bytes = traffic_gb * 1024 ** 3 if traffic_gb else 0

        payload = {
            "id": self.server.inbound_id,
            "settings": json.dumps({
                "clients": [{
                    "id": vpn_uuid,
                    "email": email,
                    "enable": True,
                    "expiryTime": expire_ms,
                    "totalGB": traffic_bytes,
                    "limitIp": 0,
                    "flow": "xtls-rprx-vision"
                }]
            })
        }

        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.post(
                f"{self.base_url}/panel/api/inbounds/addClient",
                headers=self._get_headers(),
                json=payload
            )
            return resp.json()

    async def delete_client(self, vpn_uuid: str) -> dict:
        if not self._session_cookie:
            await self._login()
        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.post(
                f"{self.base_url}/panel/api/inbounds/{self.server.inbound_id}/delClient/{vpn_uuid}",
                headers=self._get_headers()
            )
            return resp.json()

    async def update_client_expiry(self, vpn_uuid: str, expire_days: int) -> dict:
        """Обновить срок подписки (при продлении)"""
        if not self._session_cookie:
            await self._login()
        expire_ms = expire_days * 24 * 60 * 60 * 1000
        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.post(
                f"{self.base_url}/panel/api/inbounds/updateClient/{vpn_uuid}",
                headers=self._get_headers(),
                json={
                    "id": self.server.inbound_id,
                    "settings": json.dumps({
                        "clients": [{
                            "id": vpn_uuid,
                            "expiryTime": expire_ms,
                            "enable": True
                        }]
                    })
                }
            )
            return resp.json()

    def get_sub_link(self, vpn_uuid: str) -> str:
        """Ссылка подписки — клиент подтягивает все серверы автоматически"""
        return f"{self.base_url}/sub/{vpn_uuid}"
```

### Менеджер нескольких серверов

```python
# app/services/xui_manager.py
import asyncio
from app.services.xui import XUIClient, XUIServer
from app.database import get_db
from app import models

async def get_all_active_servers(db) -> list[XUIServer]:
    servers = await db.execute(
        select(models.Server).where(models.Server.is_active == True)
    )
    return servers.scalars().all()

async def add_client_to_all_servers(
    user_id: int,
    vpn_uuid: str,
    email: str,
    expire_days: int,
    traffic_gb: int = 0,
    db = None
):
    """Параллельно добавляем клиента на все активные серверы"""
    servers = await get_all_active_servers(db)

    async def add_to_server(server):
        client = XUIClient(XUIServer(
            name=server.name,
            url=server.url,
            username=server.username,
            password=server.password,
            inbound_id=server.inbound_id
        ))
        try:
            result = await client.add_client(vpn_uuid, email, expire_days, traffic_gb)
            sub_link = client.get_sub_link(vpn_uuid)
            # Сохраняем конфиг в БД
            await db.execute(
                insert(models.UserServerConfig).values(
                    user_id=user_id,
                    server_id=server.id,
                    vpn_uuid=vpn_uuid,
                    sub_link=sub_link
                ).on_conflict_do_nothing()
            )
            return {"server": server.name, "status": "ok"}
        except Exception as e:
            return {"server": server.name, "status": "error", "error": str(e)}

    results = await asyncio.gather(*[add_to_server(s) for s in servers])
    await db.commit()
    return results

async def remove_client_from_all_servers(vpn_uuid: str, db):
    """Удалить клиента с всех серверов (отмена / истечение)"""
    servers = await get_all_active_servers(db)

    async def remove_from_server(server):
        client = XUIClient(XUIServer(
            name=server.name, url=server.url,
            username=server.username, password=server.password,
            inbound_id=server.inbound_id
        ))
        try:
            await client.delete_client(vpn_uuid)
            return {"server": server.name, "status": "ok"}
        except Exception as e:
            return {"server": server.name, "status": "error", "error": str(e)}

    return await asyncio.gather(*[remove_from_server(s) for s in servers])
```

---

## Сервис: Platega.io (`services/platega.py`)

**Документация:** https://docs.platega.io

**Авторизация:** два заголовка `X-MerchantId` и `X-Secret` в каждом запросе.

**Базовый URL:** `https://app.platega.io`

**Методы оплаты:**
- `10` — банковские карты РФ
- `2` — СБП QR

```python
# app/services/platega.py
import httpx
from app.config import settings

PLATEGA_BASE_URL = "https://app.platega.io"

def _headers() -> dict:
    return {
        "X-MerchantId": settings.PLATEGA_MERCHANT_ID,
        "X-Secret": settings.PLATEGA_SECRET,
        "Content-Type": "application/json"
    }

async def create_payment(
    amount: float,
    user_id: int,
    plan_id: int,
    payment_method: int = 10    # 10=карты, 2=СБП
) -> dict:
    """
    Создаёт транзакцию. Возвращает redirect URL для пользователя.
    Ответ содержит: transactionId, redirect, status="PENDING"
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{PLATEGA_BASE_URL}/transaction/process",
            headers=_headers(),
            json={
                "paymentMethod": payment_method,
                "paymentDetails": {
                    "amount": amount,
                    "currency": "RUB"
                },
                "description": f"VPN подписка",
                "return": f"{settings.FRONTEND_URL}/payment/success",
                "failedUrl": f"{settings.FRONTEND_URL}/payment/failed",
                # payload вернётся в webhook as-is
                "payload": f"user_id={user_id}&plan_id={plan_id}"
            }
        )
        resp.raise_for_status()
        return resp.json()
        # {
        #   "transactionId": "uuid",
        #   "redirect": "https://pay.platega.io?...",
        #   "status": "PENDING"
        # }

async def get_payment_status(transaction_id: str) -> dict:
    """Ручная проверка статуса — резервный вариант если webhook не дошёл"""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{PLATEGA_BASE_URL}/transaction/{transaction_id}/status",
            headers=_headers()
        )
        resp.raise_for_status()
        return resp.json()
```

### Webhook от Platega

```python
# app/routers/webhooks.py  (фрагмент)
from fastapi import APIRouter, Request, HTTPException, Response
from app.config import settings
from app.services.subscription import activate_subscription, revoke_subscription

router = APIRouter(prefix="/webhook")

@router.post("/platega")
async def platega_webhook(request: Request, db=Depends(get_db)):
    # Верификация: Platega присылает X-MerchantId и X-Secret
    merchant_id = request.headers.get("X-MerchantId")
    secret = request.headers.get("X-Secret")

    if merchant_id != settings.PLATEGA_MERCHANT_ID or secret != settings.PLATEGA_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    body = await request.json()
    # Структура callback:
    # {
    #   "id": "uuid транзакции",
    #   "amount": 299.0,
    #   "currency": "RUB",
    #   "status": "CONFIRMED",   # CONFIRMED | CANCELED | CHARGEBACKED
    #   "paymentMethod": 10,
    #   "payload": "user_id=123&plan_id=2"
    # }

    transaction_id = body["id"]
    status = body["status"]
    payload = dict(p.split("=") for p in body.get("payload", "").split("&"))
    user_id = int(payload.get("user_id", 0))
    plan_id = int(payload.get("plan_id", 0))

    # Обновляем статус платежа в БД
    await db.execute(
        update(Payment)
        .where(Payment.external_id == transaction_id)
        .values(status=status.lower(), updated_at=datetime.utcnow())
    )

    if status == "CONFIRMED":
        await activate_subscription(user_id, plan_id, db)
    elif status == "CHARGEBACKED":
        await revoke_subscription(user_id, db)

    await db.commit()
    # Platega ждёт HTTP 200 в течение 60 сек,
    # при отсутствии — до 3 повторных попыток с интервалом 5 минут
    return Response(status_code=200)
```

> **Настройка Callback URL в ЛК Platega:** Настройки → Callback URLs → `https://api.yourvpn.com/webhook/platega`
> Требования: только HTTPS, публичный IP/домен, валидный SSL от доверенного CA.

---

## Сервис: BTCPay Server (`services/btcpay.py`)

**Self-hosted** на отдельном VPS. Минимум 2GB RAM для Bitcoin full node.
Альтернатива — использовать Lightning Network (меньше требований к ресурсам).

```python
# app/services/btcpay.py
import httpx
import hmac
import hashlib
from app.config import settings

BTCPAY_BASE = settings.BTCPAY_URL          # "https://btcpay.yourvpn.com"
STORE_ID = settings.BTCPAY_STORE_ID
API_KEY = settings.BTCPAY_API_KEY

async def create_invoice(amount_usd: float, user_id: int, plan_id: int) -> dict:
    """
    Создаёт invoice. Поддерживает Bitcoin, Lightning Network.
    Возвращает checkoutLink — ссылка для редиректа пользователя.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BTCPAY_BASE}/api/v1/stores/{STORE_ID}/invoices",
            headers={
                "Authorization": f"token {API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "amount": str(amount_usd),
                "currency": "USD",
                "metadata": {
                    "user_id": user_id,
                    "plan_id": plan_id
                },
                "checkout": {
                    "redirectURL": f"{settings.FRONTEND_URL}/payment/success",
                    "redirectAutomatically": True,
                    "defaultPaymentMethod": "BTC"
                }
            }
        )
        resp.raise_for_status()
        return resp.json()
        # {"id": "...", "checkoutLink": "https://btcpay.yourvpn.com/i/..."}

def verify_btcpay_signature(body: bytes, signature_header: str) -> bool:
    """Верифицируем webhook от BTCPay через HMAC-SHA256"""
    expected = hmac.new(
        settings.BTCPAY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature_header)
```

### Webhook от BTCPay

```python
@router.post("/btcpay")
async def btcpay_webhook(request: Request, db=Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("BTCPay-Sig", "")

    if not verify_btcpay_signature(body, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = json.loads(body)
    # Типы событий: InvoiceSettled, InvoiceExpired, InvoiceInvalid
    event_type = data.get("type")
    metadata = data.get("metadata", {})
    user_id = metadata.get("user_id")
    plan_id = metadata.get("plan_id")

    if event_type == "InvoiceSettled":
        await activate_subscription(user_id, plan_id, db)
    elif event_type in ("InvoiceExpired", "InvoiceInvalid"):
        await mark_payment_failed(user_id, data["invoiceId"], db)

    await db.commit()
    return Response(status_code=200)
```

---

## Сервис: логика подписок (`services/subscription.py`)

```python
# app/services/subscription.py
import uuid
from datetime import datetime, timedelta
from app.services.xui_manager import add_client_to_all_servers, remove_client_from_all_servers
from app.services.email import send_configs_email  # реализовать отдельно

async def activate_subscription(user_id: int, plan_id: int, db):
    """Главная функция активации после успешной оплаты"""
    # 1. Получить план
    plan = await db.get(Plan, plan_id)

    # 2. Получить или создать VPN UUID пользователя
    user = await db.get(User, user_id)
    if not user.vpn_uuid:
        user.vpn_uuid = str(uuid.uuid4())
        db.add(user)

    # 3. Создать или продлить подписку
    existing_sub = await get_active_subscription(user_id, db)
    if existing_sub:
        # Продление: добавляем дни к текущей дате окончания
        existing_sub.ends_at += timedelta(days=plan.duration_days)
        # Обновить expiry на серверах
        await update_expiry_on_all_servers(user.vpn_uuid, existing_sub.ends_at)
    else:
        # Новая подписка
        ends_at = datetime.utcnow() + timedelta(days=plan.duration_days)
        sub = Subscription(
            user_id=user_id,
            plan_id=plan_id,
            started_at=datetime.utcnow(),
            ends_at=ends_at,
            is_active=True,
            traffic_gb=plan.traffic_gb
        )
        db.add(sub)
        # Добавить на все серверы
        await add_client_to_all_servers(
            user_id=user_id,
            vpn_uuid=user.vpn_uuid,
            email=user.email,
            expire_days=plan.duration_days,
            traffic_gb=plan.traffic_gb or 0,
            db=db
        )

    user.is_active = True
    db.add(user)

    # 4. Отправить конфиги на email
    await send_configs_email(user_id, db)

async def revoke_subscription(user_id: int, db):
    """Отозвать доступ (chargeback, ручная отмена)"""
    user = await db.get(User, user_id)
    if user.vpn_uuid:
        await remove_client_from_all_servers(user.vpn_uuid, db)
    user.is_active = False
    # Деактивировать подписку
    await db.execute(
        update(Subscription)
        .where(Subscription.user_id == user_id, Subscription.is_active == True)
        .values(is_active=False)
    )
    db.add(user)
```

---

## Фоновые задачи Celery (`tasks/celery_app.py`)

```python
from celery import Celery
from celery.schedules import crontab

celery_app = Celery("vpn_shop", broker="redis://redis:6379/0")

celery_app.conf.beat_schedule = {
    # Каждую ночь в 03:00 — проверяем истёкшие подписки
    "expire-subscriptions": {
        "task": "tasks.expire_subscriptions",
        "schedule": crontab(hour=3, minute=0)
    },
    # Каждые 5 минут — healthcheck серверов
    "check-servers-health": {
        "task": "tasks.check_servers_health",
        "schedule": 300.0
    },
    # За 3 дня до окончания — напоминание о продлении
    "send-renewal-reminders": {
        "task": "tasks.send_renewal_reminders",
        "schedule": crontab(hour=10, minute=0)
    }
}

@celery_app.task
async def expire_subscriptions():
    """Отключить пользователей с истёкшей подпиской"""
    # SELECT users WHERE subscription ends_at < NOW() AND is_active = true
    # Для каждого: revoke_subscription()

@celery_app.task
async def check_servers_health():
    """Пинговать все серверы, обновлять is_active"""
    # GET /panel/api/inbounds/list на каждом сервере
    # При ошибке — пометить is_active=False, уведомить администратора

@celery_app.task
async def send_renewal_reminders():
    """Email-напоминания за 3 дня до окончания"""
    # SELECT subscriptions WHERE ends_at BETWEEN NOW() AND NOW() + 3 days
```

---

## API эндпоинты (FastAPI)

### Аутентификация
```
POST /auth/register        — регистрация
POST /auth/login           — JWT токен
POST /auth/refresh         — обновить токен
```

### Подписки
```
GET  /plans                — список тарифов (публичный)
GET  /subscriptions/me     — текущая подписка пользователя
GET  /subscriptions/configs — конфиги и ссылки для клиентов
```

### Платежи
```
POST /payments/platega/create   — создать платёж (карты/СБП)
POST /payments/btcpay/create    — создать invoice (биткоин)
GET  /payments/status/{id}      — проверить статус
```

### Webhook (публичные, без авторизации)
```
POST /webhook/platega      — callback от Platega.io
POST /webhook/btcpay       — callback от BTCPay Server
```

### Серверы (только для пользователей с активной подпиской)
```
GET  /servers              — список доступных серверов
GET  /servers/{id}/config  — получить конфиг для конкретного сервера
```

---

## Docker Compose

```yaml
# docker-compose.yml
version: '3.9'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: vpnshop
      POSTGRES_USER: vpnuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    env_file: .env
    depends_on: [db, redis]
    ports:
      - "8000:8000"
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000

  celery_worker:
    build: ./backend
    env_file: .env
    depends_on: [db, redis]
    command: celery -A app.tasks.celery_app worker --loglevel=info

  celery_beat:
    build: ./backend
    env_file: .env
    depends_on: [db, redis]
    command: celery -A app.tasks.celery_app beat --loglevel=info

  frontend:
    build: ./frontend
    env_file: .env
    ports:
      - "3000:3000"

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    ports:
      - "80:80"
      - "443:443"
    depends_on: [backend, frontend]

volumes:
  postgres_data:
  redis_data:
```

---

## Переменные окружения (`.env.example`)

```env
# База данных
DATABASE_URL=postgresql+asyncpg://vpnuser:password@db:5432/vpnshop
REDIS_URL=redis://redis:6379/0

# JWT
SECRET_KEY=your-very-secret-jwt-key-change-this
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Platega.io
# Получить в ЛК: https://my.platega.io → Настройки
PLATEGA_MERCHANT_ID=your-merchant-id
PLATEGA_SECRET=your-secret-key

# BTCPay Server
BTCPAY_URL=https://btcpay.yourvpn.com
BTCPAY_STORE_ID=your-store-id
BTCPAY_API_KEY=your-api-key
BTCPAY_WEBHOOK_SECRET=your-webhook-secret

# Frontend
FRONTEND_URL=https://yourvpn.com
NEXT_PUBLIC_API_URL=https://api.yourvpn.com

# Email (для отправки конфигов)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourvpn.com
SMTP_PASSWORD=your-smtp-password

# 3x-ui серверы (добавляются через админ-панель в БД)
# Пример данных для первого сервера:
# name: "Germany Frankfurt"
# url: https://de.yourvpn.com:2053
# username: admin
# password: your-3xui-password
# inbound_id: 1
```

---

## Порядок реализации (рекомендуемый)

### Фаза 1 — Инфраструктура
1. `docker-compose.yml` — поднять PostgreSQL, Redis
2. SQLAlchemy модели + Alembic миграции
3. FastAPI приложение — базовая структура, healthcheck

### Фаза 2 — Аутентификация
4. Регистрация / логин (JWT)
5. Middleware для проверки токена

### Фаза 3 — VPN интеграция
6. `services/xui.py` — клиент для одного сервера
7. `services/xui_manager.py` — менеджер нескольких серверов
8. Эндпоинт `/servers` и `/subscriptions/configs`

### Фаза 4 — Платежи
9. `services/platega.py` — создание платежа
10. `POST /webhook/platega` — обработка callback
11. `services/btcpay.py` — создание invoice
12. `POST /webhook/btcpay` — обработка callback
13. `services/subscription.py` — логика активации

### Фаза 5 — Автоматизация
14. Celery tasks — истечение подписок, healthcheck серверов
15. Email-уведомления

### Фаза 6 — Frontend
16. Next.js лендинг + страница тарифов
17. Личный кабинет — конфиги, статус подписки
18. Страницы success/failed после оплаты

### Фаза 7 — Деплой
19. Nginx конфигурация + SSL (Certbot)
20. CI/CD (GitHub Actions)

---

## Полезные ссылки

- **3x-ui GitHub:** https://github.com/MHSanaei/3x-ui
- **3x-ui Wiki (API):** https://github.com/MHSanaei/3x-ui/wiki
- **Platega API Docs:** https://docs.platega.io
- **Platega Python SDK:** https://github.com/ploki1337/plategaio
- **BTCPay Server Docs:** https://docs.btcpayserver.org
- **BTCPay Greenfield API:** https://docs.btcpayserver.org/API/Greenfield/v1/

---

## Важные замечания

- Пароли от 3x-ui хранить зашифрованными в БД (использовать `cryptography` или Vault)
- Webhook endpoints должны быть на HTTPS с валидным SSL (требование Platega)
- 3x-ui API может потребовать отключённую верификацию SSL (`verify=False` в httpx) — только для внутренних серверов
- При добавлении нового сервера в БД — автоматически запускать задачу синхронизации всех активных пользователей на него
- Логировать все вызовы к 3x-ui API и платёжным системам для отладки
