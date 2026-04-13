import uuid as uuid_lib
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    vpn_uuid: Mapped[uuid_lib.UUID | None] = mapped_column(UUID(as_uuid=True), unique=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    @property
    def is_admin(self) -> bool:
        from app.config import settings
        return bool(settings.ADMIN_EMAIL) and self.email == settings.ADMIN_EMAIL

    subscriptions = relationship("Subscription", back_populates="user", lazy="selectin")
    payments = relationship("Payment", back_populates="user", lazy="selectin")
    server_configs = relationship("UserServerConfig", back_populates="user", lazy="selectin")
