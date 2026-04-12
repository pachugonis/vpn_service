from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.payment import Payment
from app.models.plan import Plan
from app.models.user import User
from app.schemas.payment import BtcPaymentCreate, PaymentCreate, PaymentResponse
from app.services import btcpay, platega

router = APIRouter()


@router.post("/platega/create", response_model=PaymentResponse)
async def create_platega_payment(
    data: PaymentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
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


@router.post("/btcpay/create", response_model=PaymentResponse)
async def create_btcpay_payment(
    data: BtcPaymentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
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
