from typing import Optional, TYPE_CHECKING
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field, Relationship
import uuid

if TYPE_CHECKING:
    from app.models.workspace import Workspace


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Integration(SQLModel, table=True):
    __tablename__ = "integrations"

    id: str = Field(default_factory=_uuid, primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    provider: str  # Salesforce | HubSpot | Apollo | LinkedIn | Slack | etc.
    is_active: bool = Field(default=False)
    sync_status: str = Field(default="SUCCESS")   # SUCCESS | SYNCING | FAILED
    records_synced: int = Field(default=0)
    last_synced_at: Optional[datetime] = Field(default=None)

    workspace: Optional["Workspace"] = Relationship(back_populates="integrations")
