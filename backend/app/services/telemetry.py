"""
Real-time WebSocket telemetry server.
Broadcasts live crawl progress, pipeline events, and AI activity to connected clients.
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class TelemetryBroadcaster:
    """Manages WebSocket connections and broadcasts events to all connected clients."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"[WS] Client connected. Total connections: {len(self.active_connections)}")

        await self._send_to(websocket, {
            "type": "CONNECTED",
            "message": "Lead Intelligence AI telemetry stream connected.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"[WS] Client disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, event: dict):
        """Send event to all connected clients. Remove dead connections."""
        dead = set()
        for connection in self.active_connections:
            try:
                await self._send_to(connection, event)
            except Exception:
                dead.add(connection)
        self.active_connections -= dead

    async def _send_to(self, websocket: WebSocket, data: dict):
        await websocket.send_text(json.dumps(data, default=str))


# ── Global broadcaster instance ───────────────────────────────────────────────
broadcaster = TelemetryBroadcaster()


# ── Real-time crawl event helpers ─────────────────────────────────────────────

async def broadcast_crawl_log(
    job_id: str,
    message: str,
    pages_crawled: int,
    pages_total: int,
) -> None:
    """Broadcast a single crawl log line to all connected WS clients."""
    await broadcaster.broadcast({
        "type": "CRAWL_LOG",
        "jobId": job_id,
        "message": message,
        "pagesCrawled": pages_crawled,
        "pagesTotal": pages_total,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


async def broadcast_crawl_started(job_id: str, url: str) -> None:
    """Broadcast crawl job started event."""
    await broadcaster.broadcast({
        "type": "CRAWL_STARTED",
        "jobId": job_id,
        "url": url,
        "message": f"Starting live crawl of {url}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


async def broadcast_crawl_complete(
    job_id: str,
    lead_id: str,
    company_name: str,
    ai_score: int,
    pages_crawled: int,
    technologies: list,
    emails_count: int,
    phones_count: int,
    socials_count: int,
) -> None:
    """Broadcast crawl completion event with a summary."""
    await broadcaster.broadcast({
        "type": "CRAWL_COMPLETE",
        "jobId": job_id,
        "leadId": lead_id,
        "companyName": company_name,
        "aiScore": ai_score,
        "pagesCrawled": pages_crawled,
        "technologies": technologies[:8],
        "emailsFound": emails_count,
        "phonesFound": phones_count,
        "socialsFound": socials_count,
        "message": f"✅ Crawl complete: {company_name} — AI Score {ai_score}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


async def broadcast_crawl_error(job_id: str, url: str, error: str) -> None:
    """Broadcast crawl failure event."""
    await broadcaster.broadcast({
        "type": "CRAWL_ERROR",
        "jobId": job_id,
        "url": url,
        "error": error,
        "message": f"❌ Crawl failed for {url}: {error}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


async def broadcast_lead_qualified(lead_id: str, company_name: str, ai_score: int) -> None:
    """Broadcast when a lead is qualified after scoring."""
    await broadcaster.broadcast({
        "type": "LEAD_QUALIFIED",
        "leadId": lead_id,
        "companyName": company_name,
        "aiScore": ai_score,
        "message": f"🏆 Lead qualified: {company_name} — Score {ai_score}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


# ── Background keepalive (minimal, no fake data) ──────────────────────────────

async def telemetry_simulator():
    """
    Minimal background loop — sends a heartbeat ping every 30 seconds.
    Real events are now broadcast from the crawl pipeline directly.
    """
    while True:
        await asyncio.sleep(30)
        if broadcaster.active_connections:
            await broadcaster.broadcast({
                "type": "HEARTBEAT",
                "message": "Lead Intelligence AI — system operational",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
