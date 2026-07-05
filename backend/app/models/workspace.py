from typing import Optional, TYPE_CHECKING
from datetime import datetime, timezone
import uuid

from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.lead import Lead
    from app.models.pipeline import Pipeline
    from app.models.campaign import Campaign
    from app.models.integration import Integration
    from app.models.analytics import AnalyticsMetric, ActivityFeed


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Workspace(SQLModel, table=True):
    __tablename__ = "workspaces"

    id: str = Field(default_factory=_uuid, primary_key=True)
    name: str = Field(unique=True, index=True)
    logo_url: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)

    members: list["WorkspaceMember"] = Relationship(
        back_populates="workspace"
    )

    leads: list["Lead"] = Relationship(
        back_populates="workspace"
    )

    pipelines: list["Pipeline"] = Relationship(
        back_populates="workspace"
    )

    campaigns: list["Campaign"] = Relationship(
        back_populates="workspace"
    )

    integrations: list["Integration"] = Relationship(
        back_populates="workspace"
    )

    analytics: list["AnalyticsMetric"] = Relationship(
        back_populates="workspace"
    )

    feeds: list["ActivityFeed"] = Relationship(
        back_populates="workspace"
    )


class WorkspaceMember(SQLModel, table=True):
    __tablename__ = "workspace_members"

    id: str = Field(default_factory=_uuid, primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    role: str = Field(default="MEMBER")
    joined_at: datetime = Field(default_factory=_now)

    workspace: Optional["Workspace"] = Relationship(
        back_populates="members"
    )

    user: Optional["User"] = Relationship(
        back_populates="workspace_members"
    )