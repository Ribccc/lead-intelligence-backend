import logging
from sqlmodel import SQLModel, text
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Async Engine ───────────────────────────────────────────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    poolclass=NullPool,  # safe for async
)

# ── Session Factory ────────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ── Dependency ─────────────────────────────────────────────────────────────────
async def get_session() -> AsyncSession:  # type: ignore[override]
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ── Table Init (dev only – use Alembic in production) ─────────────────────────
async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        
        # Verify and add validation_status column if it doesn't exist
        try:
            dialect_name = conn.dialect.name
            if dialect_name == "postgresql":
                check_query = text(
                    "SELECT 1 FROM information_schema.columns "
                    "WHERE table_name = 'lead_social_links' AND column_name = 'validation_status'"
                )
                col_exists = (await conn.execute(check_query)).scalar()
                if not col_exists:
                    await conn.execute(text("ALTER TABLE lead_social_links ADD COLUMN validation_status VARCHAR DEFAULT 'VALID'"))
                    logger.info("Added validation_status column to lead_social_links table (PostgreSQL).")
                
                # Check confidence_score on leads
                check_leads = text(
                    "SELECT 1 FROM information_schema.columns "
                    "WHERE table_name = 'leads' AND column_name = 'confidence_score'"
                )
                leads_col_exists = (await conn.execute(check_leads)).scalar()
                if not leads_col_exists:
                    await conn.execute(text("ALTER TABLE leads ADD COLUMN confidence_score FLOAT DEFAULT 0.0"))
                    logger.info("Added confidence_score column to leads table (PostgreSQL).")

                # Check and add other missing columns on leads
                missing_cols_pg = [
                    ("postal_code", "VARCHAR"),
                    ("full_address", "VARCHAR"),
                    ("latitude", "DOUBLE PRECISION"),
                    ("longitude", "DOUBLE PRECISION")
                ]
                for col_name, col_type in missing_cols_pg:
                    check_col = text(
                        f"SELECT 1 FROM information_schema.columns "
                        f"WHERE table_name = 'leads' AND column_name = '{col_name}'"
                    )
                    if not (await conn.execute(check_col)).scalar():
                        await conn.execute(text(f"ALTER TABLE leads ADD COLUMN {col_name} {col_type}"))
                        logger.info(f"Added {col_name} column to leads table (PostgreSQL).")
            else:
                result = await conn.execute(text("PRAGMA table_info(lead_social_links)"))
                columns = [row[1] for row in result.fetchall()]
                if "validation_status" not in columns:
                    await conn.execute(text("ALTER TABLE lead_social_links ADD COLUMN validation_status VARCHAR DEFAULT 'VALID'"))
                    logger.info("Added validation_status column to lead_social_links table (SQLite).")
                
                result_leads = await conn.execute(text("PRAGMA table_info(leads)"))
                columns_leads = [row[1] for row in result_leads.fetchall()]
                if "confidence_score" not in columns_leads:
                    await conn.execute(text("ALTER TABLE leads ADD COLUMN confidence_score FLOAT DEFAULT 0.0"))
                    logger.info("Added confidence_score column to leads table (SQLite).")

                missing_cols_sqlite = [
                    ("postal_code", "VARCHAR"),
                    ("full_address", "VARCHAR"),
                    ("latitude", "FLOAT"),
                    ("longitude", "FLOAT")
                ]
                for col_name, col_type in missing_cols_sqlite:
                    if col_name not in columns_leads:
                        await conn.execute(text(f"ALTER TABLE leads ADD COLUMN {col_name} {col_type}"))
                        logger.info(f"Added {col_name} column to leads table (SQLite).")
        except Exception as e:
            logger.warning(f"Error checking/adding columns to tables: {e}")

    # Run data migration for separating URL entities
    await migrate_historical_social_links(engine)


async def migrate_historical_social_links(engine_obj) -> None:
    """
    Migrates records from `lead_social_links` to separate tables:
    - lead_social_profiles
    - lead_contact_pages
    - lead_about_pages
    - lead_support_pages
    - lead_careers_pages
    - lead_product_pages
    Deduplicates URLs per category per lead.
    """
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import select
    from app.models.lead import (
        LeadSocialLink, LeadSocialProfile, LeadContactPage, 
        LeadAboutPage, LeadSupportPage, LeadCareersPage, LeadProductPage
    )
    from app.runners.crawler import validate_social_url, normalize_social_url, determine_network
    
    # We will open a session
    from sqlalchemy.orm import sessionmaker
    async_session = sessionmaker(
        engine_obj, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        # Check if the new tables already have records
        try:
            profile_count_stmt = select(LeadSocialProfile)
            profile_res = await session.execute(profile_count_stmt)
            if profile_res.scalars().first():
                logger.info("New tables already contain records. Skipping historical migration.")
                return
        except Exception as e:
            logger.warning(f"Could not check new tables: {e}. Attempting migration anyway.")

        # Query all records from lead_social_links
        try:
            links_res = await session.execute(select(LeadSocialLink))
            social_links = links_res.scalars().all()
            if not social_links:
                logger.info("No historical social links found to migrate.")
                return
                
            logger.info(f"Found {len(social_links)} historical records in lead_social_links. Starting migration...")
            
            # Categories tracking per lead to deduplicate
            added_profiles = set()
            added_contacts = set()
            added_abouts = set()
            added_supports = set()
            added_careers = set()
            added_products = set()

            for link in social_links:
                url = normalize_social_url(link.social_url)
                if not url:
                    continue
                    
                url_lower = url.lower()
                
                # Apply rules:
                is_social = False
                if any(domain in url_lower for domain in ('linkedin.com', 'github.com', 'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'youtube.com', 'youtu.be')):
                    if validate_social_url(url):
                        is_social = True
                
                if is_social:
                    key = (link.lead_id, url)
                    if key not in added_profiles:
                        net_type = determine_network(url)
                        session.add(LeadSocialProfile(
                            lead_id=link.lead_id,
                            social_url=url,
                            network=net_type,
                            source_url=link.source_url or link.social_url,
                            discovery_page=link.discovery_page or link.source_url,
                            crawl_timestamp=link.crawl_timestamp,
                            confidence_score=link.confidence_score or 1.0,
                            validation_status="VALID"
                        ))
                        added_profiles.add(key)
                
                elif 'contact' in url_lower:
                    key = (link.lead_id, url)
                    if key not in added_contacts:
                        session.add(LeadContactPage(
                            lead_id=link.lead_id,
                            url=url,
                            source_url=link.source_url or link.social_url,
                            discovery_page=link.discovery_page or link.source_url,
                            crawl_timestamp=link.crawl_timestamp,
                            confidence_score=link.confidence_score or 1.0
                        ))
                        added_contacts.add(key)

                elif 'about' in url_lower:
                    key = (link.lead_id, url)
                    if key not in added_abouts:
                        session.add(LeadAboutPage(
                            lead_id=link.lead_id,
                            url=url,
                            source_url=link.source_url or link.social_url,
                            discovery_page=link.discovery_page or link.source_url,
                            crawl_timestamp=link.crawl_timestamp,
                            confidence_score=link.confidence_score or 1.0
                        ))
                        added_abouts.add(key)

                elif 'support' in url_lower or 'help' in url_lower:
                    key = (link.lead_id, url)
                    if key not in added_supports:
                        session.add(LeadSupportPage(
                            lead_id=link.lead_id,
                            url=url,
                            source_url=link.source_url or link.social_url,
                            discovery_page=link.discovery_page or link.source_url,
                            crawl_timestamp=link.crawl_timestamp,
                            confidence_score=link.confidence_score or 1.0
                        ))
                        added_supports.add(key)

                elif 'careers' in url_lower or 'jobs' in url_lower or 'join' in url_lower:
                    key = (link.lead_id, url)
                    if key not in added_careers:
                        session.add(LeadCareersPage(
                            lead_id=link.lead_id,
                            url=url,
                            source_url=link.source_url or link.social_url,
                            discovery_page=link.discovery_page or link.source_url,
                            crawl_timestamp=link.crawl_timestamp,
                            confidence_score=link.confidence_score or 1.0
                        ))
                        added_careers.add(key)

                else:
                    key = (link.lead_id, url)
                    if key not in added_products:
                        session.add(LeadProductPage(
                            lead_id=link.lead_id,
                            url=url,
                            source_url=link.source_url or link.social_url,
                            discovery_page=link.discovery_page or link.source_url,
                            crawl_timestamp=link.crawl_timestamp,
                            confidence_score=link.confidence_score or 1.0
                        ))
                        added_products.add(key)

            await session.commit()
            logger.info(f"Successfully migrated records into separated tables.")
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error migrating historical social links: {e}")
