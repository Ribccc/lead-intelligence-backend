import json
import logging
from datetime import datetime, timezone
from typing import Optional

import redis as redis_lib
from fastapi import APIRouter, Depends, Query, HTTPException, status, BackgroundTasks
from sqlalchemy import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.deps import CurrentUser
from app.models.pipeline import Pipeline, PipelineNode, PipelineEdge
from app.schemas.ops import (
    PipelineCreate, NodeCoordBatch, PipelineOut, PipelineNodeOut, PipelineEdgeOut
)
import uuid

router = APIRouter(prefix="/pipelines", tags=["Pipelines"])
logger = logging.getLogger(__name__)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _status_key(pipeline_id: str) -> str:
    return f"pipeline:status:{pipeline_id}"


def _get_redis():
    return redis_lib.from_url(settings.CELERY_BROKER_URL, decode_responses=True)


def _map_pipeline(pipeline: Pipeline, nodes: list, edges: list) -> PipelineOut:
    return PipelineOut(
        id=pipeline.id,
        name=pipeline.name,
        isActive=pipeline.is_active,
        createdAt=pipeline.created_at,
        nodes=[
            PipelineNodeOut(
                id=n.id, type=n.type, name=n.name,
                config=json.loads(n.config) if n.config else {},
                status=n.status, throughput=n.throughput,
                processed=n.processed, x=n.x, y=n.y,
            )
            for n in nodes
        ],
        edges=[
            PipelineEdgeOut(id=e.id, source=e.source_node_id, target=e.target_node_id)
            for e in edges
        ],
    )


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("", response_model=list[PipelineOut])
async def list_pipelines(
    workspaceId: str = Query(...),
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Pipeline).where(Pipeline.workspace_id == workspaceId)  # type: ignore
    )
    pipelines = result.scalars().all()

    out = []
    for p in pipelines:
        nodes_r = await session.execute(select(PipelineNode).where(PipelineNode.pipeline_id == p.id))  # type: ignore
        edges_r = await session.execute(select(PipelineEdge).where(PipelineEdge.pipeline_id == p.id))  # type: ignore
        out.append(_map_pipeline(p, nodes_r.scalars().all(), edges_r.scalars().all()))
    return out


@router.post("", response_model=PipelineOut, status_code=status.HTTP_201_CREATED)
async def create_pipeline(
    body: PipelineCreate,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    pipeline = Pipeline(
        id=str(uuid.uuid4()),
        workspace_id=body.workspaceId,
        name=body.name,
        is_active=False,
    )
    session.add(pipeline)
    await session.flush()

    nodes = []
    for n in (body.nodes or []):
        node = PipelineNode(
            id=str(uuid.uuid4()),
            pipeline_id=pipeline.id,
            type=n.type,
            name=n.name,
            config=json.dumps(n.config or {}),
            status="IDLE",
            x=n.x or 0.0,
            y=n.y or 0.0,
        )
        session.add(node)
        nodes.append(node)

    await session.commit()
    await session.refresh(pipeline)
    return _map_pipeline(pipeline, nodes, [])


@router.patch("/{pipeline_id}/nodes/coordinates")
async def update_node_coordinates(
    pipeline_id: str,
    body: NodeCoordBatch,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    for coord in body.nodes:
        node = await session.get(PipelineNode, coord.id)
        if node:
            node.x = coord.x
            node.y = coord.y
            session.add(node)
    await session.commit()
    return {"message": "Pipeline visual layout coordinates updated successfully"}


@router.put("/{pipeline_id}/layout")
async def update_node_coordinates_layout(
    pipeline_id: str,
    body: NodeCoordBatch,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    """PUT layout coordinate saving route. Matches frontend apiClient calls."""
    for coord in body.nodes:
        node = await session.get(PipelineNode, coord.id)
        if node:
            node.x = coord.x
            node.y = coord.y
            session.add(node)
    await session.commit()
    return {"message": "Pipeline visual layout coordinates updated successfully"}


@router.post("/{pipeline_id}/execute")
async def execute_pipeline(
    pipeline_id: str,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    """
    Triggers end-to-end real execution of pipeline tasks via Celery workers.
    Initialises a QUEUED status in Redis immediately so the frontend
    status-polling endpoint has something to display right away.
    """
    pipeline = await session.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    # Set all nodes to RUNNING status in DB
    nodes_r = await session.execute(
        select(PipelineNode).where(PipelineNode.pipeline_id == pipeline_id)  # type: ignore
    )
    for node in nodes_r.scalars().all():
        node.status = "RUNNING"
        node.throughput = 0.0
        session.add(node)
    await session.commit()

    # Write initial QUEUED status to Redis immediately
    initial_logs = [
        f"Pipeline '{pipeline.name}' queued for execution...",
        "Dispatching to Celery worker pool...",
    ]
    try:
        r = _get_redis()
        payload = {
            "status": "QUEUED",
            "logs": initial_logs,
            "leads_discovered": 0,
            "crawl_progress": 0,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "error": None,
        }
        r.setex(_status_key(pipeline_id), 7200, json.dumps(payload))
    except Exception as e:
        logger.warning(f"[Redis] Could not write initial pipeline status: {e}")

    # Dispatch to Celery if workers are active, otherwise fallback to local BackgroundTasks
    task_id: Optional[str] = None
    celery_active = False
    try:
        from app.core.celery_app import celery_app
        insp = celery_app.control.inspect(timeout=0.2)
        if insp:
            stats = insp.stats()
            if stats:
                celery_active = True
    except Exception as ce:
        logger.warning(f"[FastAPI] Celery workers offline or unreachable: {ce}")

    if celery_active:
        try:
            from app.tasks.pipeline_tasks import run_pipeline_simulation
            task = run_pipeline_simulation.delay(pipeline_id, pipeline.workspace_id)
            task_id = task.id
            logger.info(f"[FastAPI] Pipeline {pipeline_id} queued via Celery. task_id={task_id}")
        except Exception as e:
            logger.warning(f"[FastAPI] Celery dispatch failed: {e}. Falling back to BackgroundTasks.")
            celery_active = False

    if not celery_active:
        logger.info(f"[FastAPI] Celery workers offline. Using BackgroundTasks fallback for pipeline {pipeline_id}.")
        async def run_local_orchestrator():
            from app.core.database import AsyncSessionLocal
            from app.runners.orchestrator import PipelineOrchestrator
            from app.tasks.pipeline_tasks import _write_status
            try:
                async with AsyncSessionLocal() as local_session:
                    orchestrator = PipelineOrchestrator(local_session, status_callback=_write_status)
                    result = await orchestrator.run(pipeline_id=pipeline_id, workspace_id=pipeline.workspace_id)
                    _write_status(
                        pipeline_id,
                        "COMPLETED",
                        result.get("logs", []),
                        leads_discovered=result.get("leads_discovered", 0),
                        crawl_progress=100,
                    )
            except Exception as ex:
                logger.error(f"Local orchestrator failed for pipeline {pipeline_id}: {ex}")
                _write_status(pipeline_id, "FAILED", [f"❌ Fatal error: {str(ex)}"], error=str(ex))

        background_tasks.add_task(run_local_orchestrator)

    return {
        "message": "Pipeline execution launched. Poll /status for real-time progress.",
        "pipelineId": pipeline_id,
        "taskId": task_id,
        "status": "QUEUED",
        "avgVelocityLpm": 142.0,
        "activeEnginesCount": 4,
        "logs": initial_logs,
    }


@router.get("/{pipeline_id}/status")
async def get_pipeline_status(
    pipeline_id: str,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    """
    Returns real-time pipeline execution status.
    Reads from Redis (live worker logs) and DB (node states, lead counts).
    Frontend polls this every 3 seconds while status is QUEUED or RUNNING.
    """
    pipeline = await session.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    # Read live status from Redis
    redis_status = None
    redis_logs = []
    leads_discovered = 0
    crawl_progress = 0
    error = None

    try:
        r = _get_redis()
        raw = r.get(_status_key(pipeline_id))
        if raw:
            data = json.loads(raw)
            redis_status = data.get("status")
            redis_logs = data.get("logs", [])
            leads_discovered = data.get("leads_discovered", 0)
            crawl_progress = data.get("crawl_progress", 0)
            error = data.get("error")
    except Exception as e:
        logger.warning(f"[Redis] Status read failed: {e}")

    # Read current node states from DB for UI graph update
    nodes_r = await session.execute(
        select(PipelineNode).where(PipelineNode.pipeline_id == pipeline_id)  # type: ignore
    )
    db_nodes = nodes_r.scalars().all()

    node_states = [
        {
            "id": n.id,
            "type": n.type,
            "name": n.name,
            "status": n.status,
            "processed": n.processed or 0,
        }
        for n in db_nodes
    ]

    # Derive status from node states if Redis key expired
    if not redis_status:
        all_done = all(n["status"] == "COMPLETED" for n in node_states)
        any_failed = any(n["status"] == "FAILED" for n in node_states)
        any_running = any(n["status"] == "RUNNING" for n in node_states)
        if any_failed:
            redis_status = "FAILED"
        elif all_done:
            redis_status = "COMPLETED"
        elif any_running:
            redis_status = "RUNNING"
        else:
            redis_status = "IDLE"

    # Fetch pipeline effects metrics
    from app.models.lead import Lead, LeadEmail, LeadPhone
    from sqlalchemy import func
    
    queue_stmt = select(func.count()).select_from(Lead).where(
        Lead.workspace_id == pipeline.workspace_id,
        Lead.status == "DISCOVERED",
        Lead.website != None, Lead.website != ""
    )
    crawl_queue_count = (await session.execute(queue_stmt)).scalar() or 0

    disc_stmt = select(func.count()).select_from(Lead).where(
        Lead.workspace_id == pipeline.workspace_id,
        Lead.status.in_(["DISCOVERED", "CRAWLED", "ENRICHED"])
    )
    discovered_leads_count = (await session.execute(disc_stmt)).scalar() or 0

    qual_stmt = select(func.count()).select_from(Lead).where(
        Lead.workspace_id == pipeline.workspace_id,
        Lead.status == "QUALIFIED"
    )
    qualified_leads_count = (await session.execute(qual_stmt)).scalar() or 0

    emails_stmt = select(func.count(LeadEmail.id)).join(Lead, Lead.id == LeadEmail.lead_id).where(Lead.workspace_id == pipeline.workspace_id)
    phones_stmt = select(func.count(LeadPhone.id)).join(Lead, Lead.id == LeadPhone.lead_id).where(Lead.workspace_id == pipeline.workspace_id)
    emails_count = (await session.execute(emails_stmt)).scalar() or 0
    phones_count = (await session.execute(phones_stmt)).scalar() or 0
    contacts_count = emails_count + phones_count

    return {
        "pipelineId": pipeline_id,
        "pipelineName": pipeline.name,
        "status": redis_status,
        "crawlProgress": crawl_progress,
        "leadsDiscovered": leads_discovered or total_processed,
        "logs": redis_logs,
        "nodeStates": node_states,
        "error": error,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "effects": {
            "crawlQueue": crawl_queue_count,
            "discoveredLeads": discovered_leads_count,
            "qualifiedLeads": qualified_leads_count,
            "contacts": contacts_count
        }
    }
