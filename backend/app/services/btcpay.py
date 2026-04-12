import hashlib
import hmac

import httpx

from app.config import settings


async def create_invoice(amount_usd: float, user_id: int, plan_id: int) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.BTCPAY_URL}/api/v1/stores/{settings.BTCPAY_STORE_ID}/invoices",
            headers={
                "Authorization": f"token {settings.BTCPAY_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "amount": str(amount_usd),
                "currency": "USD",
                "metadata": {"user_id": user_id, "plan_id": plan_id},
                "checkout": {
                    "redirectURL": f"{settings.FRONTEND_URL}/payment/success",
                    "redirectAutomatically": True,
                    "defaultPaymentMethod": "BTC",
                },
            },
        )
        resp.raise_for_status()
        return resp.json()


def verify_btcpay_signature(body: bytes, signature_header: str) -> bool:
    expected = hmac.new(
        settings.BTCPAY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature_header)
