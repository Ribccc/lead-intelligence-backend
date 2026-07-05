from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "lead_intelligence",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.pipeline_tasks",
        "app.tasks.ai_tasks",
        "app.tasks.sync_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.tasks.pipeline_tasks.*": {"queue": "pipeline"},
        "app.tasks.ai_tasks.*": {"queue": "ai"},
        "app.tasks.sync_tasks.*": {"queue": "pipeline"},
    },
    beat_schedule={
        # Periodic sync health check every 5 minutes
        "sync-integrations-health": {
            "task": "app.tasks.sync_tasks.check_integration_health",
            "schedule": 300.0,
        },
    },
)
