"""
Enterprise database seeder.
Creates admin user, workspace, 20 enterprise leads, pipelines, campaigns,
integrations, analytics metrics, and activity feed entries.

Usage:
    python -m app.seed
"""
import asyncio
import json
import uuid
import logging
from datetime import datetime, timezone, timedelta

from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.models.lead import Lead, AIInsight, IntentSignal, QualificationReason
from app.models.pipeline import Pipeline, PipelineNode, PipelineEdge
from app.models.campaign import Campaign, CampaignStep, CampaignLead
from app.models.integration import Integration
from app.models.analytics import AnalyticsMetric, ActivityFeed, AuditLog

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _uuid() -> str:
    return str(uuid.uuid4())


def _now(delta_days: int = 0) -> datetime:
    return (datetime.now(timezone.utc) - timedelta(days=delta_days)).replace(tzinfo=None)


ENTERPRISE_LEADS = [
    {"company": "Stripe", "sector": "FinTech", "industry": "Payments Infrastructure", "employees": 8000, "funding": "$2.2B (Series I)", "aiScore": 96, "convProb": 92.4, "status": "QUALIFIED", "hiringStatus": "HIGH_VOLUME", "country": "US", "revenueRange": "$100M+", "discoverySource": "Crunchbase"},
    {"company": "Databricks", "sector": "Data & AI", "industry": "Unified Data Analytics", "employees": 5000, "funding": "$1.6B (Series I)", "aiScore": 94, "convProb": 88.7, "status": "ENRICHED", "hiringStatus": "HIGH_VOLUME", "country": "US", "revenueRange": "$100M+", "discoverySource": "Crunchbase"},
    {"company": "Snowflake", "sector": "Cloud Data", "industry": "Data Warehousing", "employees": 6300, "funding": "Public (NYSE: SNOW)", "aiScore": 91, "convProb": 85.1, "status": "QUALIFIED", "hiringStatus": "EXECUTIVE_SEARCH", "country": "US", "revenueRange": "$100M+", "discoverySource": "Crunchbase"},
    {"company": "Anthropic", "sector": "AI Safety", "industry": "Large Language Models", "employees": 700, "funding": "$7.3B (Series C)", "aiScore": 89, "convProb": 83.5, "status": "ENRICHED", "hiringStatus": "HIGH_VOLUME", "country": "US", "revenueRange": "$20M-$100M", "discoverySource": "YC companies"},
    {"company": "Scale AI", "sector": "AI Infrastructure", "industry": "Data Labeling & AI", "employees": 900, "funding": "$1B (Series F)", "aiScore": 87, "convProb": 81.2, "status": "NURTURE", "hiringStatus": "STABLE", "country": "US", "revenueRange": "$20M-$100M", "discoverySource": "Crunchbase"},
    {"company": "Cohere", "sector": "Enterprise AI", "industry": "NLP & Embeddings", "employees": 500, "funding": "$445M (Series C)", "aiScore": 85, "convProb": 79.0, "status": "ENRICHED", "hiringStatus": "HIGH_VOLUME", "country": "CA", "revenueRange": "$20M-$100M", "discoverySource": "YC companies"},
    {"company": "Rippling", "sector": "HR Tech", "industry": "Workforce Management", "employees": 2200, "funding": "$1.2B (Series E)", "aiScore": 82, "convProb": 76.3, "status": "DISCOVERED", "hiringStatus": "HIGH_VOLUME", "country": "US", "revenueRange": "$100M+", "discoverySource": "YC companies"},
    {"company": "Deel", "sector": "HR Tech", "industry": "Global Payroll & Compliance", "employees": 3500, "funding": "$425M (Series D)", "aiScore": 80, "convProb": 74.8, "status": "ENRICHING", "hiringStatus": "EXECUTIVE_SEARCH", "country": "US", "revenueRange": "$100M+", "discoverySource": "Crunchbase"},
    {"company": "Figma", "sector": "Design Tech", "industry": "Collaborative Design", "employees": 1500, "funding": "Acquired by Adobe ($20B)", "aiScore": 78, "convProb": 72.5, "status": "NURTURE", "hiringStatus": "STABLE", "country": "US", "revenueRange": "$100M+", "discoverySource": "Product Hunt"},
    {"company": "Linear", "sector": "Productivity", "industry": "Project Management SaaS", "employees": 90, "funding": "$52M (Series B)", "aiScore": 76, "convProb": 70.1, "status": "DISCOVERED", "hiringStatus": "NONE", "country": "US", "revenueRange": "$5M-$20M", "discoverySource": "Startup directories"},
    {"company": "Vercel", "sector": "Developer Infrastructure", "industry": "Edge Deployment", "employees": 600, "funding": "$250M (Series D)", "aiScore": 88, "convProb": 83.0, "status": "QUALIFIED", "hiringStatus": "HIGH_VOLUME", "country": "US", "revenueRange": "$100M+", "discoverySource": "Product Hunt"},
    {"company": "PlanetScale", "sector": "Database", "industry": "MySQL-compatible Cloud DB", "employees": 200, "funding": "$105M (Series C)", "aiScore": 72, "convProb": 66.4, "status": "ENRICHED", "hiringStatus": "STABLE", "country": "US", "revenueRange": "$5M-$20M", "discoverySource": "YC companies"},
    {"company": "Retool", "sector": "Low-Code", "industry": "Internal Tool Builder", "employees": 400, "funding": "$145M (Series C)", "aiScore": 74, "convProb": 68.9, "status": "NURTURE", "hiringStatus": "NONE", "country": "US", "revenueRange": "$20M-$100M", "discoverySource": "YC companies"},
    {"company": "Amplitude", "sector": "Analytics", "industry": "Product Intelligence", "employees": 900, "funding": "Public (NASDAQ: AMPL)", "aiScore": 77, "convProb": 71.3, "status": "ENRICHED", "hiringStatus": "EXECUTIVE_SEARCH", "country": "US", "revenueRange": "$100M+", "discoverySource": "Crunchbase"},
    {"company": "Notion", "sector": "Productivity", "industry": "Collaborative Workspace", "employees": 600, "funding": "$275M (Series C)", "aiScore": 69, "convProb": 63.8, "status": "DISCOVERED", "hiringStatus": "NONE", "country": "US", "revenueRange": "$100M+", "discoverySource": "Product Hunt"},
    {"company": "Brex", "sector": "FinTech", "industry": "Corporate Finance", "employees": 1200, "funding": "$1.5B (Series D)", "aiScore": 84, "convProb": 78.6, "status": "QUALIFIED", "hiringStatus": "HIGH_VOLUME", "country": "US", "revenueRange": "$100M+", "discoverySource": "YC companies"},
    {"company": "Lattice", "sector": "HR Tech", "industry": "Performance Management", "employees": 550, "funding": "$175M (Series F)", "aiScore": 71, "convProb": 65.2, "status": "NURTURE", "hiringStatus": "STABLE", "country": "US", "revenueRange": "$20M-$100M", "discoverySource": "Startup directories"},
    {"company": "PostHog", "sector": "Analytics", "industry": "Open Source Product Analytics", "employees": 60, "funding": "$27M (Series B)", "aiScore": 65, "convProb": 58.7, "status": "DISCOVERED", "hiringStatus": "NONE", "country": "GB", "revenueRange": "$5M-$20M", "discoverySource": "YC companies"},
    {"company": "Temporal", "sector": "Developer Tools", "industry": "Workflow Orchestration", "employees": 250, "funding": "$100M (Series B)", "aiScore": 79, "convProb": 73.4, "status": "ENRICHED", "hiringStatus": "HIGH_VOLUME", "country": "US", "revenueRange": "$5M-$20M", "discoverySource": "YC companies"},
    {"company": "Supabase", "sector": "Database", "industry": "Open Source Firebase Alternative", "employees": 150, "funding": "$80M (Series B)", "aiScore": 73, "convProb": 67.5, "status": "ENRICHING", "hiringStatus": "STABLE", "country": "US", "revenueRange": "$5M-$20M", "discoverySource": "YC companies"},
]

INTENT_SIGNALS_POOL = [
    ("Pricing Page View", "High"), ("Case Study Download", "High"), ("Webinar Attendance", "Medium"),
    ("API Docs Exploration", "High"), ("Demo Request Submitted", "High"), ("LinkedIn Ad Click", "Medium"),
    ("Blog Post Engagement", "Low"), ("Trial Sign-Up", "High"), ("ROI Calculator Usage", "High"),
    ("Competitor Comparison Page", "Medium"),
]

INSIGHTS_POOL = [
    ("APAC Expansion push detected in Q3 earnings call transcript.", "earnings_report"),
    ("CTO posted on LinkedIn about scaling data infrastructure.", "linkedin"),
    ("Job postings indicate major ML engineering team build-out.", "job_postings"),
    ("Series funding announcement aligns with enterprise sales motion.", "news"),
    ("Product team attended SaaS pricing summit — high purchase intent.", "event"),
    ("Tech stack migration from AWS to GCP detected via DNS signals.", "tech_stack"),
    ("VP of Engineering actively engaging with AI automation content.", "social_signals"),
]


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)

    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionLocal() as session:
        logger.info("🌱 Seeding enterprise data...")

        # ── Admin User ─────────────────────────────────────────────────────────
        admin = User(
            id=_uuid(),
            email=settings.SEED_ADMIN_EMAIL,
            password_hash=hash_password(settings.SEED_ADMIN_PASSWORD),
            first_name="Admin",
            last_name="Administrator",
            role="SUPER_ADMIN",
            avatar_url="https://api.dicebear.com/7.x/initials/svg?seed=Admin%20Administrator",
        )
        session.add(admin)

        # ── Workspace ──────────────────────────────────────────────────────────
        workspace = Workspace(id=_uuid(), name="Deuglo AI Enterprise")
        session.add(workspace)
        await session.flush()

        member = WorkspaceMember(
            id=_uuid(), workspace_id=workspace.id, user_id=admin.id, role="SUPER_ADMIN"
        )
        session.add(member)

        # ── Leads ──────────────────────────────────────────────────────────────
        lead_ids = []
        for i, ld in enumerate(ENTERPRISE_LEADS):
            lead_id = _uuid()
            lead_ids.append(lead_id)
            lead = Lead(
                id=lead_id,
                workspace_id=workspace.id,
                company_name=ld["company"],
                sector=ld["sector"],
                industry=ld["industry"],
                employees=ld["employees"],
                funding=ld["funding"],
                website=f"https://{ld['company'].lower().replace(' ', '').replace('&', '')}.com",
                country=ld.get("country"),
                revenue_range=ld.get("revenueRange"),
                discovery_source=ld.get("discoverySource"),
                hiring_status=ld["hiringStatus"],
                conversion_prob=ld["convProb"],
                ai_score=ld["aiScore"],
                status=ld["status"],
                created_at=_now(i * 2),
            )
            session.add(lead)

            # Add 2-3 intent signals per lead
            for j in range(min(3, (ld["aiScore"] // 30) + 1)):
                sig = INTENT_SIGNALS_POOL[(i + j) % len(INTENT_SIGNALS_POOL)]
                session.add(IntentSignal(
                    id=_uuid(), lead_id=lead_id,
                    signal_type=sig[0], volume=j + 1, intensity=sig[1],
                    detected_at=_now(i),
                ))

            # Add 1-2 AI insights per lead
            for k in range(2 if ld["aiScore"] > 80 else 1):
                insight = INSIGHTS_POOL[(i + k) % len(INSIGHTS_POOL)]
                session.add(AIInsight(
                    id=_uuid(), lead_id=lead_id,
                    summary=insight[0], source_type=insight[1],
                    created_at=_now(i + k),
                ))

            # Add qualification reasons for high-score leads
            if ld["aiScore"] >= 80:
                for reason_text in [
                    f"High hiring activity in Data Engineering roles at {ld['company']}",
                    f"Recent funding round aligns with enterprise procurement cycles",
                ]:
                    session.add(QualificationReason(
                        id=_uuid(), lead_id=lead_id,
                        description=reason_text, passed=True, checked_at=_now(i),
                    ))

        # ── Pipeline ───────────────────────────────────────────────────────────
        pipeline_id = _uuid()
        pipeline = Pipeline(
            id=pipeline_id, workspace_id=workspace.id,
            name="Enterprise Lead Intelligence Pipeline", is_active=True,
        )
        session.add(pipeline)

        node_configs = [
            ("SEED_SOURCE", "Apollo + LinkedIn Sales Nav", {"sources": ["apollo", "linkedin"], "limit": 5000}, 100, 200),
            ("WEB_CRAWLER", "Corporate Intelligence Crawler", {"speed": "82 req/sec", "targets": ["news", "blogs", "press"]}, 400, 200),
            ("AI_QUALIFIER", "GPT-4o Intent Qualifier", {"model": "gpt-4o", "threshold": 0.85}, 700, 100),
            ("DATA_CLEANING", "Deduplication Engine", {"strategy": "fuzzy_match"}, 700, 300),
            ("DEEP_SCAN", "Deep Enrichment Scan", {"enrich": ["funding", "headcount", "tech_stack"]}, 1000, 200),
            ("OUTREACH", "AI Outreach Generator", {"model": "gpt-4o", "templates": 3}, 1300, 200),
        ]

        node_ids = []
        for ntype, nname, nconfig, nx, ny in node_configs:
            nid = _uuid()
            node_ids.append(nid)
            session.add(PipelineNode(
                id=nid, pipeline_id=pipeline_id,
                type=ntype, name=nname, config=json.dumps(nconfig),
                status="COMPLETED", throughput=142.0, processed=1284, x=nx, y=ny,
            ))

        for i in range(len(node_ids) - 1):
            session.add(PipelineEdge(
                id=_uuid(), pipeline_id=pipeline_id,
                source_node_id=node_ids[i], target_node_id=node_ids[i + 1],
            ))

        # ── Campaigns ──────────────────────────────────────────────────────────
        campaigns_data = [
            {
                "name": "Q4 Enterprise Growth",
                "outreach": 2847, "open": 68.4, "reply": 24.7, "bounce": 1.2,
                "risk": "VERY LOW", "used": 4200, "total": 10000,
                "steps": [
                    ("EMAIL", "AI-Generated Cold Email", {"subject": "Tailored Intelligence Suite for {{company}}", "bodyTemplate": "personalized"}),
                    ("WAIT", "Wait 4 Hours", {"duration": "4h"}),
                    ("LINKEDIN_CONNECT", "LinkedIn Connection Request", {"note": "personalized_ai"}),
                    ("WAIT", "Wait 2 Days", {"duration": "48h"}),
                    ("EMAIL", "Follow-Up: Case Study", {"template": "case_study"}),
                    ("LINKEDIN_MESSAGE", "LinkedIn Follow-Up Message", {}),
                ],
            },
            {
                "name": "Series C FinTech Outreach",
                "outreach": 1243, "open": 54.2, "reply": 18.9, "bounce": 2.8,
                "risk": "LOW", "used": 2100, "total": 5000,
                "steps": [
                    ("EMAIL", "FinTech Value Proposition", {"template": "fintech_roi"}),
                    ("WAIT", "Wait 1 Day", {"duration": "24h"}),
                    ("LINKEDIN_CONNECT", "LinkedIn Outreach", {}),
                    ("EMAIL", "ROI Calculator Follow-Up", {"attachROI": True}),
                ],
            },
        ]

        for cd in campaigns_data:
            cid = _uuid()
            campaign = Campaign(
                id=cid, workspace_id=workspace.id, name=cd["name"],
                total_outreach=cd["outreach"], open_rate=cd["open"],
                reply_rate=cd["reply"], bounce_rate=cd["bounce"],
                spam_risk=cd["risk"], credits_used=cd["used"], credits_total=cd["total"],
                is_active=True,
            )
            session.add(campaign)

            for idx, (stype, sname, sconfig) in enumerate(cd["steps"]):
                session.add(CampaignStep(
                    id=_uuid(), campaign_id=cid,
                    step_index=idx + 1, type=stype, name=sname, config=json.dumps(sconfig),
                ))

            # Associate first 3 leads
            for lid in lead_ids[:3]:
                session.add(CampaignLead(
                    id=_uuid(), campaign_id=cid, lead_id=lid,
                    current_step=2, last_status="OPENED", updated_at=_now(1),
                ))

        # ── Integrations ───────────────────────────────────────────────────────
        integrations = [
            ("Salesforce", True, "SUCCESS", 8421, 1),
            ("HubSpot", True, "SUCCESS", 3847, 2),
            ("Apollo.io", True, "SUCCESS", 12043, 0),
            ("LinkedIn Sales Navigator", True, "SUCCESS", 5621, 3),
            ("Slack", True, "SUCCESS", 0, 0),
            ("Outreach.io", False, "SUCCESS", 0, None),
            ("ZoomInfo", False, "SUCCESS", 2847, None),
        ]

        for provider, active, status, records, days_ago in integrations:
            session.add(Integration(
                id=_uuid(), workspace_id=workspace.id,
                provider=provider, is_active=active, sync_status=status,
                records_synced=records,
                last_synced_at=_now(days_ago) if days_ago is not None else None,
            ))

        # ── Analytics Metrics ──────────────────────────────────────────────────
        metrics = [
            ("revenue_pipeline", 24_850_000.0),
            ("qualified_leads", 1284.0),
            ("active_campaigns", 42.0),
            ("ai_accuracy", 98.4),
            ("avg_velocity", 142.0),
        ]
        for name, value in metrics:
            session.add(AnalyticsMetric(
                id=_uuid(), workspace_id=workspace.id, metric_name=name, value=value,
            ))

        # ── Activity Feed ──────────────────────────────────────────────────────
        feed_events = [
            ("LEAD_ALERT", "High-Value Lead Detected", "Stripe Inc. matched 4/4 qualification criteria. AI Score: 96/100", 96, 1),
            ("AI_INSIGHT", "Pipeline Execution Complete", "Enterprise pipeline processed 1,284 leads in 8.7 minutes at 142 lpm", None, 0),
            ("CAMPAIGN_EVENT", "Q4 Campaign Reply Surge", "23 new replies in the last 2 hours — 68.4% open rate achieved", None, 0),
            ("LEAD_ALERT", "Databricks Intent Spike", "Pricing page visited 14 times — immediate outreach recommended", 88, 1),
            ("SYSTEM", "Model Upgrade Applied", "GPT-4o context window extended to 128K. Re-qualifying top 50 leads.", None, 2),
            ("AI_INSIGHT", "Snowflake Qualified", "Passed all 5 qualification criteria — moving to QUALIFIED pipeline stage", 96, 2),
            ("LEAD_ALERT", "New Funding Signal", "Temporal Technologies raised $100M Series B — high expansion intent", 79, 3),
        ]

        for ftype, ftitle, fdesc, fscore, days_ago in feed_events:
            session.add(ActivityFeed(
                id=_uuid(), workspace_id=workspace.id,
                type=ftype, title=ftitle, description=fdesc,
                score=fscore, meta=None, created_at=_now(days_ago),
            ))

        # ── Audit Log ──────────────────────────────────────────────────────────
        session.add(AuditLog(
            id=_uuid(), user_id=admin.id,
            action="SYSTEM_SEED", details="Enterprise database seed completed.",
            timestamp=_now(0),
        ))

        await session.commit()
        logger.info("✅ Enterprise seed data committed successfully.")
        logger.info(f"   → Admin: {settings.SEED_ADMIN_EMAIL} / {settings.SEED_ADMIN_PASSWORD}")
        logger.info(f"   → Workspace: {workspace.name}")
        logger.info(f"   → Leads: {len(ENTERPRISE_LEADS)}")
        logger.info(f"   → Campaigns: {len(campaigns_data)}")
        logger.info(f"   → Integrations: {len(integrations)}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
