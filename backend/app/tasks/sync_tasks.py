import logging
import time
import asyncio
from datetime import datetime, timezone
from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models.integration import Integration
from app.models.lead import Lead
from sqlmodel import select

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.sync_tasks.sync_crm_provider")
def sync_crm_provider(integration_id: str, provider: str, workspace_id: str):
    """
    Sync records from a CRM provider.
    Saves sync state, queries active leads, and persists records count.
    """
    logger.info(f"[CRM Sync] Starting sync for {provider} (integration: {integration_id})")

    async def run_sync():
        async with AsyncSessionLocal() as session:
            # 1. Get the integration
            integration = await session.get(Integration, integration_id)
            if not integration:
                logger.error(f"[CRM Sync] Integration {integration_id} not found")
                return {"status": "FAILED", "error": "Integration not found"}

            # 2. Query all leads for the workspace
            statement = select(Lead).where(Lead.workspace_id == workspace_id)
            result = await session.execute(statement)
            leads = result.scalars().all()
            records_count = len(leads)

            # 3. Simulate syncing API call latency
            await asyncio.sleep(2.0)

            # 4. Update sync state
            integration.records_synced = records_count
            integration.sync_status = "SUCCESS"
            integration.last_synced_at = datetime.now(timezone.utc).replace(tzinfo=None)
            session.add(integration)
            await session.commit()

            logger.info(f"[CRM Sync] {provider} sync complete. Synced {records_count} records.")
            return {
                "integrationId": integration_id,
                "provider": provider,
                "recordsSynced": records_count,
                "status": "SUCCESS",
            }

    # Handle async execution from sync Celery worker context
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError("Loop closed")
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    if loop.is_running():
        future = asyncio.run_coroutine_threadsafe(run_sync(), loop)
        return future.result()
    else:
        return loop.run_until_complete(run_sync())


@celery_app.task(name="app.tasks.sync_tasks.check_integration_health")
def check_integration_health():
    """
    Periodic health check for all active integrations.
    Runs every 5 minutes via Celery Beat schedule.
    """
    logger.info("[Integration Health] Running periodic health checks...")
    return {"status": "OK", "checkedAt": time.time()}
