from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.database import init_db, get_db
from app.services.no_show_worker import start_no_show_worker, stop_no_show_worker
from app.api.v1 import (
    auth,
    colleges,
    resources,
    bookings,
    checkin,
    maintenance,
    users,
    analytics,
    notifications
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database schema is ready and start background worker
    init_db()
    start_no_show_worker()
    yield
    # Shutdown: Gracefully stop background worker
    stop_no_show_worker()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SlotSpot Zero-Cost Cloud Campus Resource Booking SaaS API",
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local frontend on any port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API V1 Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["Authentication"])
app.include_router(colleges.router, prefix=f"{settings.API_V1_PREFIX}/colleges", tags=["Colleges & Settings"])
app.include_router(resources.router, prefix=f"{settings.API_V1_PREFIX}/resources", tags=["Resources"])
app.include_router(bookings.router, prefix=f"{settings.API_V1_PREFIX}/bookings", tags=["Bookings"])
app.include_router(checkin.router, prefix=f"{settings.API_V1_PREFIX}/checkin", tags=["Check-in & Returns"])
app.include_router(maintenance.router, prefix=f"{settings.API_V1_PREFIX}/maintenance", tags=["Maintenance"])
app.include_router(users.router, prefix=f"{settings.API_V1_PREFIX}/users", tags=["User Management"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_PREFIX}/analytics", tags=["Analytics & Reports"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_PREFIX}/notifications", tags=["Notifications"])


@app.get("/", tags=["Health"])
def root():
    return {
        "app": "SlotSpot Campus Resource Booking SaaS",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "status": "online"
    }


@app.get("/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    try:
        # Check database connectivity
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/ready", tags=["Health"])
def readiness_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"ready": True}
