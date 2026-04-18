from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models.payment import Payment
from app.models.plan import Plan
from app.models.user import User
from app.schemas.payment import (
    BtcPaymentCreate,
    PaymentCreate,
    PaymentMethodsResponse,
    PaymentMethodInfo,
    PaymentResponse,
    YookassaPaymentCreate,
)
from app.services import btcpay, platega, yookassa

router = APIRouter()


@router.get("/methods", response_model=PaymentMethodsResponse)
async def list_payment_methods():
    """Возвращает список доступных платёжных провайдеров.

    Активны только те, для которых заполнены ключи в .env.
    """
    return PaymentMethodsResponse(
        methods=[
            PaymentMethodInfo(
                id="platega",
                title="Platega",
                description="Оплата картой РФ / СБП",
                enabled=settings.platega_enabled,
            ),
            PaymentMethodInfo(
                id="yookassa",
                title="ЮKassa",
                description="Оплата картой РФ / СБП",
                enabled=settings.yookassa_enabled,
            ),
            PaymentMethodInfo(
                id="btcpay",
                title="Bitcoin",
                description="Оплата Bitcoin / Lightning",
                enabled=settings.btcpay_enabled,
            ),
        ]
    )


@router.post("/platega/create", response_model=PaymentResponse)
async def create_platega_payment(
    data: PaymentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.platega_enabled:
        raise HTTPException(status_code=400, detail="Platega payments disabled")

    plan = await db.get(Plan, data.plan_id)
    if not plan or not plan.is_active:
        raise HTTPException(status_code=404, detail="Plan not found")

    result = await platega.create_payment(
        amount=float(plan.price_rub),
        user_id=user.id,
        plan_id=plan.id,
        payment_method=data.payment_method,
    )

    payment = Payment(
        user_id=user.id,
        plan_id=plan.id,
        provider="platega",
        external_id=result["transactionId"],
        amount=plan.price_rub,
        currency="RUB",
        status="pending",
    )
    db.add(payment)
    await db.commit()

    return PaymentResponse(
        payment_id=result["transactionId"],
        redirect_url=result["redirect"],
    )


@router.post("/yookassa/create", response_model=PaymentResponse)
async def create_yookassa_payment(
    data: YookassaPaymentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.yookassa_enabled:
        raise HTTPException(status_code=400, detail="Yookassa payments disabled")

    plan = await db.get(Plan, data.plan_id)
    if not plan or not plan.is_active:
        raise HTTPException(status_code=404, detail="Plan not found")

    result = await yookassa.create_payment(
        amount=float(plan.price_rub),
        user_id=user.id,
        plan_id=plan.id,
    )

    payment = Payment(
        user_id=user.id,
        plan_id=plan.id,
        provider="yookassa",
        external_id=result["id"],
        amount=plan.price_rub,
        currency="RUB",
        status="pending",
    )
    db.add(payment)
    await db.commit()

    return PaymentResponse(
        payment_id=result["id"],
        redirect_url=result["confirmation"]["confirmation_url"],
    )


@router.post("/btcpay/create", response_model=PaymentResponse)
async def create_btcpay_payment(
    data: BtcPaymentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.btcpay_enabled:
        raise HTTPException(status_code=400, detail="BTCPay payments disabled")

    plan = await db.get(Plan, data.plan_id)
    if not plan or not plan.is_active:
        raise HTTPException(status_code=404, detail="Plan not found")

    result = await btcpay.create_invoice(
        amount_usd=float(plan.price_usd),
        user_id=user.id,
        plan_id=plan.id,
    )

    payment = Payment(
        user_id=user.id,
        plan_id=plan.id,
        provider="btcpay",
        external_id=result["id"],
        amount=plan.price_usd,
        currency="USD",
        status="pending",
    )
    db.add(payment)
    await db.commit()

    return PaymentResponse(
        payment_id=result["id"],
        redirect_url=result["checkoutLink"],
    )


@router.get("/status/{payment_id}")
async def check_payment_status(
    payment_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select

    result = await db.execute(
        select(Payment).where(Payment.external_id == payment_id, Payment.user_id == user.id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    return {
        "payment_id": payment_id,
        "status": payment.status,
        "amount": float(payment.amount),
        "currency": payment.currency,
    }
