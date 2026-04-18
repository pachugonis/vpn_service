import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.payment import Payment
from app.services.btcpay import verify_btcpay_signature
from app.services.subscription import activate_subscription, revoke_subscription
from app.services.yookassa import get_payment as yookassa_get_payment

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook")


@router.post("/platega")
async def platega_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    merchant_id = request.headers.get("X-MerchantId")
    secret = request.headers.get("X-Secret")

    if merchant_id != settings.PLATEGA_MERCHANT_ID or secret != settings.PLATEGA_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    body = await request.json()
    logger.info("Platega webhook: %s", body)

    transaction_id = body["id"]
    status_str = body["status"]
    payload = dict(p.split("=") for p in body.get("payload", "").split("&") if "=" in p)
    user_id = int(payload.get("user_id", 0))
    plan_id = int(payload.get("plan_id", 0))

    await db.execute(
        update(Payment)
        .where(Payment.external_id == transaction_id)
        .values(status=status_str.lower(), updated_at=datetime.utcnow())
    )

    if status_str == "CONFIRMED":
        await activate_subscription(user_id, plan_id, db)
    elif status_str == "CHARGEBACKED":
        await revoke_subscription(user_id, db)

    await db.commit()
    return Response(status_code=200)


@router.post("/yookassa")
async def yookassa_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Webhook от Yookassa.

    Yookassa не подписывает уведомления — для верификации мы запрашиваем
    статус платежа через API по полученному id.
    """
    body = await request.json()
    logger.info("Yookassa webhook: %s", body)

    event = body.get("event")
    obj = body.get("object") or {}
    payment_id = obj.get("id")

    if not payment_id:
        return Response(status_code=200)

    result = await db.execute(
        select(Payment).where(Payment.external_id == payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        logger.error("Yookassa webhook: payment not found id=%s", payment_id)
        return Response(status_code=200)

    try:
        verified = await yookassa_get_payment(payment_id)
    except Exception as exc:
        logger.error("Yookassa verification failed: %s", exc)
        raise HTTPException(status_code=502, detail="Verification failed")

    real_status = verified.get("status")

    if event == "payment.succeeded" and real_status == "succeeded":
        payment.status = "confirmed"
        payment.updated_at = datetime.utcnow()
        await activate_subscription(payment.user_id, payment.plan_id, db)
    elif event == "payment.canceled" or real_status == "canceled":
        payment.status = "canceled"
        payment.updated_at = datetime.utcnow()

    await db.commit()
    return Response(status_code=200)


@router.post("/btcpay")
async def btcpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("BTCPay-Sig", "")

    if not verify_btcpay_signature(body, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = json.loads(body)
    logger.info("BTCPay webhook: %s", data)

    event_type = data.get("type")
    invoice_id = data.get("invoiceId", "")

    result = await db.execute(
        select(Payment).where(Payment.external_id == invoice_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        logger.error("BTCPay webhook: payment not found for invoiceId=%s", invoice_id)
        return Response(status_code=200)

    if event_type == "InvoiceSettled":
        payment.status = "confirmed"
        payment.updated_at = datetime.utcnow()
        await activate_subscription(payment.user_id, payment.plan_id, db)
    elif event_type in ("InvoiceExpired", "InvoiceInvalid"):
        payment.status = "failed"
        payment.updated_at = datetime.utcnow()

    await db.commit()
    return Response(status_code=200)
