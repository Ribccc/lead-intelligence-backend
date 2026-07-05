from typing import Optional, TYPE_CHECKING
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field, Relationship
import uuid

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.campaign import CampaignLead


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Lead(SQLModel, table=True):
    __tablename__ = "leads"

    id: str = Field(default_factory=_uuid, primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    company_name: str = Field(index=True)
    sector: str
    industry: str
    employees: int = Field(default=0)
    funding: Optional[str] = Field(default=None)
    website: Optional[str] = Field(default=None, index=True)
    email: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    country: Optional[str] = Field(default=None)
    city: Optional[str] = Field(default=None)
    state: Optional[str] = Field(default=None)
    postal_code: Optional[str] = Field(default=None)
    full_address: Optional[str] = Field(default=None)
    latitude: Optional[float] = Field(default=None)
    longitude: Optional[float] = Field(default=None)
    revenue_range: Optional[str] = Field(default=None)
    discovery_source: Optional[str] = Field(default=None)
    hiring_status: str = Field(default="NONE")
    conversion_prob: float = Field(default=0.0)
    ai_score: int = Field(default=0, index=True)
    confidence_score: float = Field(default=0.0)
    status: str = Field(default="DISCOVERED", index=True)
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)
    # ── Intelligence fields extracted during live crawl ─────────────────────
    description: Optional[str] = Field(default=None)          # og:description / meta description
    seo_title: Optional[str] = Field(default=None)             # og:title / page title
    seo_description: Optional[str] = Field(default=None)       # meta description (raw)
    technologies: Optional[str] = Field(default=None)          # JSON array of detected tech stack
    job_count: int = Field(default=0)                          # open positions detected on careers page
    pages_crawled: int = Field(default=0)                      # total pages visited during last crawl
    job_listings: Optional[str] = Field(default=None)          # JSON array of job listings: [{"title": "React Developer", "department": "Frontend Development"}]
    hiring_departments: Optional[str] = Field(default=None)    # JSON array of unique normalized departments: ["Frontend Development", "AI / ML"]

    workspace: Optional["Workspace"] = Relationship(
        back_populates="leads"
    )

    insights: list["AIInsight"] = Relationship(
        back_populates="lead"
    )

    intent_signals: list["IntentSignal"] = Relationship(
        back_populates="lead"
    )

    reasoning_points: list["QualificationReason"] = Relationship(
        back_populates="lead"
    )

    campaign_leads: list["CampaignLead"] = Relationship(
        back_populates="lead"
    )

    emails: list["LeadEmail"] = Relationship(
        back_populates="lead",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

    phones: list["LeadPhone"] = Relationship(
        back_populates="lead",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

    social_links: list["LeadSocialLink"] = Relationship(
        back_populates="lead",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

    social_profiles: list["LeadSocialProfile"] = Relationship(
        back_populates="lead",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

    contact_pages: list["LeadContactPage"] = Relationship(
        back_populates="lead",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

    about_pages: list["LeadAboutPage"] = Relationship(
        back_populates="lead",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

    support_pages: list["LeadSupportPage"] = Relationship(
        back_populates="lead",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

    careers_pages: list["LeadCareersPage"] = Relationship(
        back_populates="lead",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

    product_pages: list["LeadProductPage"] = Relationship(
        back_populates="lead",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )



class IntentSignal(SQLModel, table=True):
    __tablename__ = "intent_signals"

    id: str = Field(default_factory=_uuid, primary_key=True)
    lead_id: str = Field(foreign_key="leads.id", index=True)
    signal_type: str
    volume: int = Field(default=1)
    intensity: str
    detected_at: datetime = Field(default_factory=_now)

    lead: Optional["Lead"] = Relationship(
        back_populates="intent_signals"
    )


class AIInsight(SQLModel, table=True):
    __tablename__ = "ai_insights"

    id: str = Field(default_factory=_uuid, primary_key=True)
    lead_id: str = Field(foreign_key="leads.id", index=True)
    summary: str
    source_type: str
    created_at: datetime = Field(default_factory=_now)

    lead: Optional["Lead"] = Relationship(
        back_populates="insights"
    )


class QualificationReason(SQLModel, table=True):
    __tablename__ = "qualification_reasons"

    id: str = Field(default_factory=_uuid, primary_key=True)
    lead_id: str = Field(foreign_key="leads.id", index=True)
    description: str
    passed: bool = Field(default=True)
    checked_at: datetime = Field(default_factory=_now)

    lead: Optional["Lead"] = Relationship(
        back_populates="reasoning_points"
    )


class LeadEmail(SQLModel, table=True):
    __tablename__ = "lead_emails"

    id: str = Field(default_factory=_uuid, primary_key=True)
    lead_id: str = Field(foreign_key="leads.id", index=True)
    email: str = Field(index=True)
    source_url: str
    discovery_page: Optional[str] = None
    crawl_timestamp: datetime = Field(default_factory=_now)
    confidence_score: float = Field(default=1.0)

    lead: Optional["Lead"] = Relationship(back_populates="emails")


class LeadPhone(SQLModel, table=True):
    __tablename__ = "lead_phones"

    id: str = Field(default_factory=_uuid, primary_key=True)
    lead_id: str = Field(foreign_key="leads.id", index=True)
    phone: str = Field(index=True)
    source_url: str
    discovery_page: Optional[str] = None
    crawl_timestamp: datetime = Field(default_factory=_now)
    confidence_score: float = Field(default=1.0)

    lead: Optional["Lead"] = Relationship(back_populates="phones")


class LeadSocialLink(SQLModel, table=True):
    __tablename__ = "lead_social_links"

    id: str = Field(default_factory=_uuid, primary_key=True)
    lead_id: str = Field(foreign_key="leads.id", index=True)
    social_url: str = Field(index=True)
    network: str
    source_url: str
    discovery_page: Optional[str] = None
    crawl_timestamp: datetime = Field(default_factory=_now)
    confidence_score: float = Field(default=1.0)
    validation_status: str = Field(default="VALID", index=True)

    lead: Optional["Lead"] = Relationship(back_populates="social_links")


class CrawlJob(SQLModel, table=True):
    __tablename__ = "crawl_jobs"

    id: str = Field(default_factory=_uuid, primary_key=True)
    url: str
    status: str = Field(default="queued", index=True)  # "queued", "crawling", "completed", "failed"
    lead_id: Optional[str] = Field(default=None, foreign_key="leads.id", index=True, nullable=True)
    error_message: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)
    # ── Real-time crawl progress tracking ───────────────────────────────────
    pages_crawled: int = Field(default=0)      # pages successfully fetched so far
    pages_total: int = Field(default=0)        # estimated total pages to visit
    crawl_logs: Optional[str] = Field(default=None)          # JSON array of log strings (streamed)
    technologies_found: Optional[str] = Field(default=None)  # JSON array of detected technologies


class LeadSocialProfile(SQLModel, table=True):
    __tablename__ = "lead_social_profiles"

    id: str = Field(default_factory=_uuid, primary_key=True)
    lead_id: str = Field(foreign_key="leads.id", index=True)
    social_url: str = Field(index=True)
    network: str
    source_url: str
    discovery_page: Optional[str] = None
    crawl_timestamp: datetime = Field(default_factory=_now)
    confidence_score: float = Field(default=1.0)
    validation_status: str = Field(default="VALID", index=True)

    lead: Optional["Lead"] = Relationship(back_populates="social_profiles")


class LeadContactPage(SQLModel, table=True):
    __tablename__ = "lead_contact_pages"

    id: str = Field(default_factory=_uuid, primary_key=True)
    lead_id: str = Field(foreign_key="leads.id", index=True)
    url: str = Field(index=True)
    source_url: str
    discovery_page: Optional[str] = None
    crawl_timestamp: datetime = Field(default_factory=_now)
    confidence_score: float = Field(default=1.0)

    lead: Optional["Lead"] = Relationship(back_populates="contact_pages")


class LeadAboutPage(SQLModel, table=True):
    __tablename__ = "lead_about_pages"

    id: str = Field(default_factory=_uuid, primary_key=True)
    lead_id: str = Field(foreign_key="leads.id", index=True)
    url: str = Field(index=True)
    source_url: str
    discovery_page: Optional[str] = None
    crawl_timestamp: datetime = Field(default_factory=_now)
    confidence_score: float = Field(default=1.0)

    lead: Optional["Lead"] = Relationship(back_populates="about_pages")


class LeadSupportPage(SQLModel, table=True):
    __tablename__ = "lead_support_pages"

    id: str = Field(default_factory=_uuid, primary_key=True)
    lead_id: str = Field(foreign_key="leads.id", index=True)
    url: str = Field(index=True)
    source_url: str
    discovery_page: Optional[str] = None
    crawl_timestamp: datetime = Field(default_factory=_now)
    confidence_score: float = Field(default=1.0)

    lead: Optional["Lead"] = Relationship(back_populates="support_pages")


class LeadCareersPage(SQLModel, table=True):
    __tablename__ = "lead_careers_pages"

    id: str = Field(default_factory=_uuid, primary_key=True)
    lead_id: str = Field(foreign_key="leads.id", index=True)
    url: str = Field(index=True)
    source_url: str
    discovery_page: Optional[str] = None
    crawl_timestamp: datetime = Field(default_factory=_now)
    confidence_score: float = Field(default=1.0)

    lead: Optional["Lead"] = Relationship(back_populates="careers_pages")


class LeadProductPage(SQLModel, table=True):
    __tablename__ = "lead_product_pages"

    id: str = Field(default_factory=_uuid, primary_key=True)
    lead_id: str = Field(foreign_key="leads.id", index=True)
    url: str = Field(index=True)
    source_url: str
    discovery_page: Optional[str] = None
    crawl_timestamp: datetime = Field(default_factory=_now)
    confidence_score: float = Field(default=1.0)

    lead: Optional["Lead"] = Relationship(back_populates="product_pages")