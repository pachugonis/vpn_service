from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import admin, auth, payments, subscriptions, webhooks, servers

app = FastAPI(title="VPN Shop API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
app.include_router(payments.router, prefix="/payments", tags=["payments"])
app.include_router(webhooks.router, tags=["webhooks"])
app.include_router(servers.router, prefix="/servers", tags=["servers"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])


@app.get("/health")
async def healthcheck():
    return {"status": "ok"}
