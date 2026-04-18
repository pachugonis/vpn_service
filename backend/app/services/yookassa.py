import uuid

import httpx

from app.config import settings

YOOKASSA_BASE_URL = "https://api.yookassa.ru/v3"


def _auth() -> tuple[str, str]:
    return (settings.YOOKASSA_SHOP_ID, settings.YOOKASSA_SECRET_KEY)


async def create_payment(
    amount: float,
    user_id: int,
    plan_id: int,
) -> dict:
    """Создаёт платёж в Yookassa.

    Возвращает dict с полями id, confirmation.confirmation_url.
    """
    idempotence_key = str(uuid.uuid4())
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{YOOKASSA_BASE_URL}/payments",
            auth=_auth(),
            headers={
                "Idempotence-Key": idempotence_key,
                "Content-Type": "application/json",
            },
            json={
                "amount": {"value": f"{amount:.2f}", "currency": "RUB"},
                "capture": True,
                "confirmation": {
                    "type": "redirect",
                    "return_url": f"{settings.FRONTEND_URL}/payment/success",
                },
                "description": "VPN подписка",
                "metadata": {
                    "user_id": str(user_id),
                    "plan_id": str(plan_id),
                },
            },
        )
        resp.raise_for_status()
        return resp.json()


async def get_payment(payment_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{YOOKASSA_BASE_URL}/payments/{payment_id}",
            auth=_auth(),
        )
        resp.raise_for_status()
        return resp.json()
