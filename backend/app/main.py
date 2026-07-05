"""
FastAPI application entry point.
Assembles all routers, middleware, WebSocket endpoints, and lifecycle hooks.
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.database import init_db, engine
from app.routers import auth, workspaces, dashboards, leads, pipelines, campaigns, integrations
from app.services.telemetry import broadcaster, telemetry_simulator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ── App Lifespan ──────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Lead Intelligence AI — FastAPI starting up...")
    await init_db()
    logger.info("✅ Database tables initialized.")

    # Start telemetry broadcaster background loop
    telemetry_task = asyncio.create_task(telemetry_simulator())

    yield

    # Cleanup
    telemetry_task.cancel()
    await engine.dispose()
    logger.info("🛑 Shutdown complete.")


# ── App Instance ──────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Python-first AI-native Lead Intelligence Platform — FastAPI Backend",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routers ───────────────────────────────────────────────────────────────
prefix = settings.API_V1_PREFIX

app.include_router(auth.router, prefix=prefix)
app.include_router(workspaces.router, prefix=prefix)
app.include_router(dashboards.router, prefix=prefix)
app.include_router(leads.router, prefix=prefix)
app.include_router(pipelines.router, prefix=prefix)
app.include_router(campaigns.router, prefix=prefix)
app.include_router(integrations.router, prefix=prefix)


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    db_status = "Failed"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_status = "Successful"
    except Exception as e:
        logger.warning(f"DB health check failed: {e}")
        db_status = "Failed"

    return {
        "status": "Operational" if db_status == "Successful" else "Degraded",
        "dbConnection": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": settings.APP_NAME,
        "apiVersion": settings.APP_VERSION,
    }


# ── WebSocket Telemetry ────────────────────────────────────────────────────────
@app.websocket("/ws/telemetry")
@app.websocket("/telemetry")
async def telemetry_ws(websocket: WebSocket):
    await broadcaster.connect(websocket)
    try:
        while True:
            # Keep connection alive — listen for client messages (ping/pong)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type":"pong"}')
    except WebSocketDisconnect:
        broadcaster.disconnect(websocket)
    except Exception as e:
        logger.error(f"[WS] Unexpected error: {e}")
        broadcaster.disconnect(websocket)


# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": "/api/docs",
    }
