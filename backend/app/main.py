from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.routes import router
from app.config import settings
from app.security import RequestLimitsMiddleware

app = FastAPI(
    title="BioVision API",
    version="0.1.0",
    description="Eye-photo anaemia pre-screening for the web client. Not a diagnostic service.",
    docs_url=None if settings.environment == "production" else "/docs",
    redoc_url=None if settings.environment == "production" else "/redoc",
    openapi_url=None if settings.environment == "production" else "/openapi.json",
)
app.add_middleware(RequestLimitsMiddleware, settings=settings)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=list(settings.allowed_hosts))
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Accept", "Content-Type"],
)
app.include_router(router)

