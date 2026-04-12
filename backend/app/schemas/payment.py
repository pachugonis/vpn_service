from pydantic import BaseModel


class PaymentCreate(BaseModel):
    plan_id: int
    payment_method: int = 10  # 10=карты, 2=СБП


class BtcPaymentCreate(BaseModel):
    plan_id: int


class PaymentResponse(BaseModel):
    payment_id: str
    redirect_url: str


class PaymentStatusResponse(BaseModel):
    payment_id: str
    status: str
    amount: float
    currency: str
