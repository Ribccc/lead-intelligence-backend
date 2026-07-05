from typing import Optional, TYPE_CHECKING
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field, Relationship
import uuid

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.lead import Lead


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Campaign(SQLModel, table=True):
    __tablename__ = "campaigns"

    id: str = Field(default_factory=_uuid, primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    name: str
    total_outreach: int = Field(default=0)
    open_rate: float = Field(default=0.0)
    reply_rate: float = Field(default=0.0)
    bounce_rate: float = Field(default=0.0)
    spam_risk: str = Field(default="VERY LOW")
    credits_used: int = Field(default=0)
    credits_total: int = Field(default=10000)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)

    workspace: Optional["Workspace"] = Relationship(
        back_populates="campaigns"
    )

    steps: list["CampaignStep"] = Relationship(
        back_populates="campaign"
    )

    leads: list["CampaignLead"] = Relationship(
        back_populates="campaign"
    )


class CampaignStep(SQLModel, table=True):
    __tablename__ = "campaign_steps"

    id: str = Field(default_factory=_uuid, primary_key=True)
    campaign_id: str = Field(foreign_key="campaigns.id", index=True)
    step_index: int
    type: str
    name: str
    config: str = Field(default="{}")

    campaign: Optional["Campaign"] = Relationship(
        back_populates="steps"
    )


class CampaignLead(SQLModel, table=True):
    __tablename__ = "campaign_leads"

    id: str = Field(default_factory=_uuid, primary_key=True)
    campaign_id: str = Field(foreign_key="campaigns.id", index=True)
    lead_id: str = Field(foreign_key="leads.id", index=True)
    current_step: int = Field(default=0)
    last_status: str = Field(default="WAITING")
    updated_at: datetime = Field(default_factory=_now)

    campaign: Optional["Campaign"] = Relationship(
        back_populates="leads"
    )

    lead: Optional["Lead"] = Relationship(
        back_populates="campaign_leads"
    )