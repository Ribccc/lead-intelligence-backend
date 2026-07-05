"""
Pipeline background tasks executed via Celery workers.
Ties visual pipeline executions to robust, asynchronous Python AI Runners.
Writes real-time progress to Redis so the status endpoint can poll it.
"""
import asyncio
import json
import logging
from datetime import datetime, timezone

import redis as redis_lib

from app.core.celery_app import celery_app
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.runners.orchestrator import PipelineOrchestrator

logger = logging.getLogger(__name__)

# Redis key helpers
def _status_key(pipeline_id: str) -> str:
    return f"pipeline:status:{pipeline_id}"

def _get_redis():
    return redis_lib.from_url(settings.CELERY_BROKER_URL, decode_responses=True)


def _write_status(pipeline_id: str, status: str, logs: list, leads_discovered: int = 0,
                  crawl_progress: int = 0, error: str = None):
    """Write pipeline execution status to Redis (TTL 2 hours)."""
    try:
        r = _get_redis()
        payload = {
            "status": status,
            "logs": logs[-50:],  # Keep last 50 log lines
            "leads_discovered": leads_discovered,
            "crawl_progress": crawl_progress,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "error": error,
        }
        r.setex(_status_key(pipeline_id), 7200, json.dumps(payload))
    except Exception as e:
        logger.warning(f"[Redis] Could not write pipeline status: {e}")


@celery_app.task(name="app.tasks.pipeline_tasks.run_pipeline_simulation", bind=True, max_retries=3)
def run_pipeline_simulation(self, pipeline_id: str, workspace_id: str):
    """
    Executes standard pipeline runner stages using async Celery worker logic.
    Chains crawler, enrichment, and scoring logic under the orchestrator.
    Writes live logs and progress to Redis for frontend status polling.
    """
    logs = ["[Worker] Pipeline task started — dispatching orchestrator..."]
    _write_status(pipeline_id, "RUNNING", logs, crawl_progress=0)

    try:
        logger.info(f"[Celery Worker] Launching Pipeline orchestrator task: {pipeline_id}")

        async def run_orchestrator():
            async with AsyncSessionLocal() as session:
                orchestrator = PipelineOrchestrator(session, status_callback=_write_status)
                return await orchestrator.run(pipeline_id=pipeline_id, workspace_id=workspace_id)

        # Handle async execution from sync Celery context
        try:
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                raise RuntimeError("Loop closed")
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        if loop.is_running():
            future = asyncio.run_coroutine_threadsafe(run_orchestrator(), loop)
            result = future.result(timeout=600)
        else:
            result = loop.run_until_complete(run_orchestrator())

        # Write final completed status with all logs
        _write_status(
            pipeline_id,
            "COMPLETED",
            result.get("logs", []),
            leads_discovered=result.get("leads_discovered", 0),
            crawl_progress=100,
        )
        return result

    except Exception as exc:
        logger.error(f"[Pipeline {pipeline_id}] Worker execution failed: {exc}")
        _write_status(pipeline_id, "FAILED", logs + [f"❌ Fatal error: {str(exc)}"], error=str(exc))
        raise self.retry(exc=exc, countdown=5)


@celery_app.task(name="app.tasks.pipeline_tasks.enrich_lead")
def enrich_lead(lead_id: str, workspace_id: str):
    """Trigger enrichment for a specific lead using AI models."""
    logger.info(f"[Lead Enrichment] Processing lead {lead_id}...")

    async def run_enrichment():
        async with AsyncSessionLocal() as session:
            from app.runners.enrichment import EnrichmentRunner
            runner = EnrichmentRunner(session)
            return await runner.run(workspace_id=workspace_id, lead_id=lead_id)

    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError("Loop closed")
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    if loop.is_running():
        future = asyncio.run_coroutine_threadsafe(run_enrichment(), loop)
        result = future.result()
    else:
        result = loop.run_until_complete(run_enrichment())

    logger.info(f"[Lead Enrichment] Lead {lead_id} enriched successfully: {result}")
    return result
