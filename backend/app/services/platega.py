import httpx

from app.config import settings

PLATEGA_BASE_URL = "https://app.platega.io"


def _headers() -> dict:
    return {
        "X-MerchantId": settings.PLATEGA_MERCHANT_ID,
        "X-Secret": settings.PLATEGA_SECRET,
        "Content-Type": "application/json",
    }


async def create_payment(
    amount: float,
    user_id: int,
    plan_id: int,
    payment_method: int = 10,
) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{PLATEGA_BASE_URL}/transaction/process",
            headers=_headers(),
            json={
                "paymentMethod": payment_method,
                "paymentDetails": {"amount": amount, "currency": "RUB"},
                "description": "VPN подписка",
                "return": f"{settings.FRONTEND_URL}/payment/success",
                "failedUrl": f"{settings.FRONTEND_URL}/payment/failed",
                "payload": f"user_id={user_id}&plan_id={plan_id}",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def get_payment_status(transaction_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{PLATEGA_BASE_URL}/transaction/{transaction_id}/status",
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()
