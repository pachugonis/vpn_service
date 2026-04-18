from pathlib import Path

from pydantic_settings import BaseSettings

_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://vpnuser:password@db:5432/vpnshop"
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT
    SECRET_KEY: str = "change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALGORITHM: str = "HS256"

    # Platega.io
    PLATEGA_MERCHANT_ID: str = ""
    PLATEGA_SECRET: str = ""

    # Yookassa
    YOOKASSA_SHOP_ID: str = ""
    YOOKASSA_SECRET_KEY: str = ""

    # BTCPay Server
    BTCPAY_URL: str = ""
    BTCPAY_STORE_ID: str = ""
    BTCPAY_API_KEY: str = ""
    BTCPAY_WEBHOOK_SECRET: str = ""

    @property
    def platega_enabled(self) -> bool:
        return bool(self.PLATEGA_MERCHANT_ID and self.PLATEGA_SECRET)

    @property
    def yookassa_enabled(self) -> bool:
        return bool(self.YOOKASSA_SHOP_ID and self.YOOKASSA_SECRET_KEY)

    @property
    def btcpay_enabled(self) -> bool:
        return bool(
            self.BTCPAY_URL and self.BTCPAY_STORE_ID and self.BTCPAY_API_KEY
        )

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"

    # Admin
    ADMIN_EMAIL: str = ""

    # Email
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    model_config = {"env_file": str(_ENV_FILE), "extra": "ignore"}


settings = Settings()
