# VPN Service

Веб-приложение для продажи VPN-подписок на базе панели **3x-ui (Xray-core)**. Пользователи покупают подписки, оплачивают картами РФ через **Platega.io** или биткоином через **BTCPay Server** и автоматически получают доступ к VPN-серверам в нескольких локациях.

## Стек

| Слой | Технология |
|------|-----------|
| Backend | FastAPI (Python 3.11+), SQLAlchemy 2.0 async, Alembic |
| Frontend | Next.js 14 (App Router, TypeScript), Tailwind CSS, shadcn/ui |
| БД / очереди | PostgreSQL, Redis, Celery |
| Инфраструктура | Docker Compose, Nginx, Let's Encrypt |
| Платежи | Platega.io (карты РФ, СБП), BTCPay Server (BTC, Lightning) |
| VPN | 3x-ui на каждом VPS |

## Возможности

- Регистрация и JWT-аутентификация
- Тарифные планы (месяц / 3 месяца / год), трафик-лимиты
- Автоматическое создание клиента на всех активных 3x-ui серверах после оплаты
- Единый `vpn_uuid` пользователя — одна ссылка подписки на все локации
- Webhooks от Platega и BTCPay с верификацией
- Celery: истечение подписок, healthcheck серверов, напоминания о продлении
- Админ-панель: планы, серверы, пользователи

## Структура

```
vpn_service/
├── backend/          # FastAPI + Celery
├── frontend/         # Next.js 14
├── nginx/            # reverse proxy + SSL
├── docker-compose.yml
├── docker-compose.prod.yml
└── CLAUDE.md         # полная спецификация
```

## Быстрый старт

```bash
cp .env.example .env   # заполнить ключи Platega / BTCPay / SMTP
docker compose up -d --build
docker compose exec backend alembic upgrade head
```

- Frontend: http://localhost:3000
- API: http://localhost:8000/docs

## Переменные окружения

Основные — см. `.env.example`. Ключевые группы: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `PLATEGA_*`, `BTCPAY_*`, `SMTP_*`, `FRONTEND_URL`.

## API

- `POST /auth/register`, `POST /auth/login`
- `GET /plans`, `GET /subscriptions/me`, `GET /subscriptions/configs`
- `POST /payments/platega/create`, `POST /payments/btcpay/create`
- `POST /webhook/platega`, `POST /webhook/btcpay`
- `GET /servers`, `GET /servers/{id}/config`

## Замечания по безопасности

- Пароли от 3x-ui хранятся зашифрованными
- Webhook-эндпоинты — только HTTPS с валидным SSL (требование Platega)
- Все вызовы к 3x-ui и платёжным провайдерам логируются

Полная спецификация проекта — в [CLAUDE.md](CLAUDE.md).
