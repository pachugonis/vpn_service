from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.site_settings import SiteSettings
from app.schemas.admin import SiteSettingsResponse

router = APIRouter()


@router.get("/settings", response_model=SiteSettingsResponse)
async def public_settings(db: AsyncSession = Depends(get_db)):
    obj = await db.get(SiteSettings, 1)
    if not obj:
        return SiteSettingsResponse(maintenance_mode=False)
    return obj
