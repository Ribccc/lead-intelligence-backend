from typing import Optional, TYPE_CHECKING
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field, Relationship
import uuid

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.user import User


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AnalyticsMetric(SQLModel, table=True):
    __tablename__ = "analytics_metrics"

    id: str = Field(default_factory=_uuid, primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    metric_name: str = Field(index=True)
    value: float
    timestamp: datetime = Field(default_factory=_now)

    workspace: Optional["Workspace"] = Relationship(back_populates="analytics")


class ActivityFeed(SQLModel, table=True):
    __tablename__ = "activity_feeds"

    id: str = Field(default_factory=_uuid, primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    type: str  # LEAD_ALERT | AI_INSIGHT | SYSTEM | CAMPAIGN_EVENT
    title: str
    description: str
    score: Optional[int] = Field(default=None)
    meta: Optional[str] = Field(default=None)  # JSON string
    created_at: datetime = Field(default_factory=_now)

    workspace: Optional["Workspace"] = Relationship(back_populates="feeds")


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"

    id: str = Field(default_factory=_uuid, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    action: str  # CREATE_CAMPAIGN | RUN_PIPELINE | etc.
    details: str
    ip_address: Optional[str] = Field(default=None)
    timestamp: datetime = Field(default_factory=_now)

    user: Optional["User"] = Relationship(back_populates="audit_logs")
