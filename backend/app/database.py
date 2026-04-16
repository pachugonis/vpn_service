from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Sync engine for Celery tasks — created lazily to avoid import-time issues
_sync_session = None


def sync_session():
    global _sync_session
    if _sync_session is None:
        sync_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
        _sync_engine = create_engine(sync_url, echo=False)
        _sync_session = sessionmaker(_sync_engine, expire_on_commit=False)
    return _sync_session()


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session
