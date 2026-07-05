import asyncio
from typing import Dict, Any
from datetime import datetime, timezone
from urllib.parse import urlparse
import logging
import re
from sqlmodel import select

from app.runners.base import BaseRunner
from app.runners.web_crawler import WebCrawler
from app.models.lead import (
    Lead, IntentSignal, AIInsight, QualificationReason,
    LeadEmail, LeadPhone, LeadSocialLink, CrawlJob,
    LeadSocialProfile, LeadContactPage, LeadAboutPage, LeadSupportPage, LeadCareersPage, LeadProductPage
)
from app.models.campaign import CampaignLead

logger = logging.getLogger(__name__)


def normalize_domain(url: str) -> str:
    """Extract clean domain from a URL to normalize website values."""
    if not url:
        return ""
    url_str = url.strip()
    if not url_str.startswith(('http://', 'https://')):
        url_str = 'https://' + url_str
    try:
        parsed = urlparse(url_str)
        netloc = parsed.netloc.lower()
        if netloc.startswith('www.'):
            netloc = netloc[4:]
        return netloc
    except Exception:
        return url_str.lower()


def determine_network(url: str) -> str:
    """Parse social media network or link category from URL."""
    url_lower = url.lower()
    if 'linkedin.com' in url_lower:
        return 'linkedin'
    elif 'twitter.com' in url_lower or 'x.com' in url_lower:
        return 'twitter'
    elif 'facebook.com' in url_lower:
        return 'facebook'
    elif 'instagram.com' in url_lower:
        return 'instagram'
    elif 'github.com' in url_lower:
        return 'github'
    elif 'youtube.com' in url_lower or 'youtu.be' in url_lower:
        return 'youtube'
    elif 'wa.me' in url_lower or 'whatsapp.com' in url_lower:
        return 'whatsapp'
    elif 't.me' in url_lower or 'telegram' in url_lower:
        return 'telegram'
    elif 'discord.gg' in url_lower or 'discord.com' in url_lower:
        return 'discord'
    elif 'contact' in url_lower:
        return 'contact_page'
    elif 'about' in url_lower:
        return 'about_page'
    else:
        return 'website'


def normalize_social_url(url: str) -> str:
    """
    Normalize social profile URLs by:
    - Prepends 'https://' if protocol is missing.
    - Lowercasing netloc/domain and scheme.
    - Removing trailing slashes from path.
    - Filtering tracking parameters (e.g. utm_*, fbclid, ref, etc.).
    """
    if not url:
        return ""
    url_str = url.strip()
    if not url_str.startswith(('http://', 'https://')):
        url_str = 'https://' + url_str
    try:
        parsed = urlparse(url_str)
        scheme = parsed.scheme.lower()
        netloc = parsed.netloc.lower()
        path = parsed.path
        if path.endswith('/') and len(path) > 1:
            path = path[:-1]
        
        # Remove tracking parameters
        from urllib.parse import parse_qsl, urlencode, urlunparse
        query_params = parse_qsl(parsed.query)
        filtered_params = []
        for key, val in query_params:
            key_lower = key.lower()
            if (key_lower.startswith('utm_') or 
                key_lower in ('fbclid', 'gclid', 'msclkid', 'ref', 'source', 'clickid', 'affiliate')):
                continue
            filtered_params.append((key, val))
        
        query = urlencode(filtered_params) if filtered_params else ""
        return urlunparse((scheme, netloc, path, parsed.params, query, parsed.fragment))
    except Exception:
        return url_str.lower()


def validate_social_url(url: str) -> bool:
    """
    Verify if the URL is an official company social profile/channel.
    Rejects individual posts, status updates, tweets, comment threads, and tracking parameters.
    """
    if not url:
        return False
    try:
        parsed = urlparse(url.lower())
        if parsed.scheme not in ('http', 'https'):
            return False
        netloc = parsed.netloc
        if not netloc or '.' not in netloc:
            return False
            
        path = parsed.path.rstrip('/')
        # Split path segments and remove empty ones
        segments = [s for s in path.split('/') if s]
        
        # 1. LinkedIn
        if 'linkedin.com' in netloc:
            # Must be an official company or school page. Reject personal profiles /in/ or /posts/ or /feed/
            if len(segments) == 2 and segments[0] in ('company', 'school'):
                return True
            return False
            
        # 2. GitHub
        if 'github.com' in netloc:
            # Must be github.com/username or github.com/orgname. Reject repositories /org/repo or subpaths
            if len(segments) == 1:
                # Reject typical github pages
                if segments[0] in ('features', 'enterprise', 'copilot', 'pricing', 'trending', 'explore', 'contact', 'about', 'login', 'join', 'sponsors', 'topics', 'collections', 'marketplace', 'pulls', 'issues', 'notifications', 'settings', 'security', 'readme', 'personal'):
                    return False
                return True
            return False
            
        # 3. Twitter/X
        if 'twitter.com' in netloc or 'x.com' in netloc:
            # Must be twitter.com/username. Reject status updates or searches
            if len(segments) == 1:
                if segments[0] in ('home', 'explore', 'notifications', 'messages', 'i', 'search', 'hashtag', 'settings', 'tos', 'privacy', 'intent', 'share', 'status', 'statuses'):
                    return False
                return True
            return False
            
        # 4. Facebook
        if 'facebook.com' in netloc:
            # Reject posts, groups, events, sharer, permalinks
            if any(s in ('posts', 'groups', 'events', 'photos', 'sharer', 'permalink.php', 'photo.php', 'watch', 'videos', 'sharer.php') for s in segments):
                return False
            if len(segments) == 1:
                if segments[0] in ('sharer', 'permalink.php', 'photo.php', 'groups', 'events', 'pages', 'watch', 'videos', 'about', 'help', 'policies', 'privacy', 'legal', 'profile.php'):
                    return False
                return True
            if segments[0] == 'pages' and len(segments) == 3:
                return True
            return False
            
        # 5. Instagram
        if 'instagram.com' in netloc:
            # Reject posts (/p/), reels, stories, explore
            if len(segments) == 1:
                if segments[0] in ('p', 'reels', 'stories', 'tv', 'explore', 'developer', 'about', 'blog', 'privacy', 'legal', 'terms'):
                    return False
                return True
            return False
            
        # 6. YouTube
        if 'youtube.com' in netloc or 'youtu.be' in netloc:
            # Reject watch, shorts, playlist, embed
            if any(s in ('watch', 'shorts', 'playlist', 'embed', 'feed', 'results', 'gaming', 'sports', 'news') for s in segments):
                return False
            if len(segments) == 1 and segments[0].startswith('@'):
                return True
            if len(segments) == 2 and segments[0] in ('c', 'user', 'channel'):
                return True
            return False
            
        # If it's a contact or about page link, it is not a social profile but is allowed as network category
        if 'contact' in path or 'about' in path:
            return True
            
        # Otherwise allow standard company websites
        return True
    except Exception:
        return False


def calculate_email_confidence(email: str, company_domain: str) -> float:
    """Calculate extraction confidence score based on domain matching."""
    email_lower = email.lower()
    if company_domain and company_domain in email_lower:
        return 1.0
    
    # Generic personal/public email providers
    generic_domains = {'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com'}
    email_domain = email_lower.split('@')[-1]
    if email_domain in generic_domains:
        return 0.8
    return 0.95


async def deduplicate_workspace_leads(session, workspace_id: str):
    """Normalize domains and merge all duplicate company records into one primary lead."""
    statement = select(Lead).where(Lead.workspace_id == workspace_id)
    result = await session.exec(statement)
    leads = result.all()

    by_domain = {}
    for lead in leads:
        domain = normalize_domain(lead.website)
        if not domain:
            continue
        by_domain.setdefault(domain, []).append(lead)

    for domain, group in by_domain.items():
        if len(group) <= 1:
            continue

        # Sort group: highest AI score first, then oldest created_at
        group.sort(key=lambda x: (x.ai_score, x.created_at), reverse=True)
        primary = group[0]
        duplicates = group[1:]

        logger.info(f"Merging duplicates for domain '{domain}' into primary lead: {primary.company_name} (ID: {primary.id})")

        for dup in duplicates:
            logger.info(f"Merging duplicate lead: {dup.company_name} (ID: {dup.id})")

            # 1. Re-associate AI Insights
            ins_stmt = select(AIInsight).where(AIInsight.lead_id == dup.id)
            ins_res = await session.exec(ins_stmt)
            for insight in ins_res.all():
                insight.lead_id = primary.id
                session.add(insight)

            # 2. Re-associate Intent Signals
            sig_stmt = select(IntentSignal).where(IntentSignal.lead_id == dup.id)
            sig_res = await session.exec(sig_stmt)
            for sig in sig_res.all():
                sig.lead_id = primary.id
                session.add(sig)

            # 3. Re-associate Qualification Reasons
            qr_stmt = select(QualificationReason).where(QualificationReason.lead_id == dup.id)
            qr_res = await session.exec(qr_stmt)
            for qr in qr_res.all():
                qr.lead_id = primary.id
                session.add(qr)

            # 4. Re-associate Campaign Leads
            cl_stmt = select(CampaignLead).where(CampaignLead.lead_id == dup.id)
            cl_res = await session.exec(cl_stmt)
            for cl in cl_res.all():
                existing_cl_stmt = select(CampaignLead).where(
                    CampaignLead.lead_id == primary.id,
                    CampaignLead.campaign_id == cl.campaign_id
                )
                existing_cl_res = await session.exec(existing_cl_stmt)
                if existing_cl_res.first():
                    await session.delete(cl)
                else:
                    cl.lead_id = primary.id
                    session.add(cl)

            # 5. Re-associate LeadEmails, LeadPhones, LeadSocialLinks
            email_stmt = select(LeadEmail).where(LeadEmail.lead_id == dup.id)
            email_res = await session.exec(email_stmt)
            for em in email_res.all():
                ex_email_stmt = select(LeadEmail).where(LeadEmail.lead_id == primary.id, LeadEmail.email == em.email)
                ex_email_res = await session.exec(ex_email_stmt)
                if ex_email_res.first():
                    await session.delete(em)
                else:
                    em.lead_id = primary.id
                    session.add(em)

            phone_stmt = select(LeadPhone).where(LeadPhone.lead_id == dup.id)
            phone_res = await session.exec(phone_stmt)
            for ph in phone_res.all():
                ex_phone_stmt = select(LeadPhone).where(LeadPhone.lead_id == primary.id, LeadPhone.phone == ph.phone)
                ex_phone_res = await session.exec(ex_phone_stmt)
                if ex_phone_res.first():
                    await session.delete(ph)
                else:
                    ph.lead_id = primary.id
                    session.add(ph)

            social_stmt = select(LeadSocialLink).where(LeadSocialLink.lead_id == dup.id)
            social_res = await session.exec(social_stmt)
            for soc in social_res.all():
                ex_soc_stmt = select(LeadSocialLink).where(LeadSocialLink.lead_id == primary.id, LeadSocialLink.social_url == soc.social_url)
                ex_soc_res = await session.exec(ex_soc_stmt)
                if ex_soc_res.first():
                    await session.delete(soc)
                else:
                    soc.lead_id = primary.id
                    session.add(soc)

            # 6. Delete the duplicate lead itself
            await session.delete(dup)

    await session.commit()


async def deduplicate_workspace_social_links(session, workspace_id: str) -> int:
    """
    Normalize, validate, and deduplicate social profiles and pages for all leads in the workspace.
    Deletes all invalid, status, comment, or post URLs and cleans up orphaned contact records.
    Returns the count of duplicate records removed.
    """
    duplicates_removed = 0
    # 1. Fetch valid lead IDs in the workspace to clean up orphans
    leads_stmt = select(Lead.id).where(Lead.workspace_id == workspace_id)
    leads_res = await session.execute(leads_stmt)
    valid_lead_ids = set(leads_res.scalars().all())

    # 2. Cleanup orphaned and invalid social profiles
    profile_stmt = select(LeadSocialProfile)
    profile_res = await session.execute(profile_stmt)
    all_profiles = profile_res.scalars().all()
    for p in all_profiles:
        if p.lead_id not in valid_lead_ids:
            await session.delete(p)
            duplicates_removed += 1
        else:
            normalized = normalize_social_url(p.social_url)
            if not normalized or not validate_social_url(normalized):
                await session.delete(p)
                duplicates_removed += 1
            else:
                p.social_url = normalized
                p.validation_status = "VALID"
                session.add(p)

    # 3. Cleanup other pages (orphans and empty URLs)
    models_to_clean = [
        (LeadContactPage, "url"),
        (LeadAboutPage, "url"),
        (LeadSupportPage, "url"),
        (LeadCareersPage, "url"),
        (LeadProductPage, "url"),
        (LeadSocialLink, "social_url")
    ]
    for model_class, url_field in models_to_clean:
        stmt = select(model_class)
        res = await session.execute(stmt)
        for item in res.scalars().all():
            val = getattr(item, url_field)
            if item.lead_id not in valid_lead_ids:
                await session.delete(item)
                duplicates_removed += 1
            else:
                normalized = normalize_social_url(val)
                if not normalized:
                    await session.delete(item)
                    duplicates_removed += 1
                else:
                    setattr(item, url_field, normalized)
                    session.add(item)

    # 4. Cleanup orphaned emails & phones & other records
    for model_class in (LeadEmail, LeadPhone, IntentSignal, AIInsight, QualificationReason):
        stmt = select(model_class)
        res = await session.execute(stmt)
        for item in res.scalars().all():
            if item.lead_id not in valid_lead_ids:
                await session.delete(item)
                duplicates_removed += 1

    await session.commit()

    # 5. Deduplicate records per lead per entity
    for lead_id in valid_lead_ids:
        # Deduplicate LeadSocialProfile
        p_stmt = select(LeadSocialProfile).where(LeadSocialProfile.lead_id == lead_id)
        p_res = await session.execute(p_stmt)
        profiles = p_res.scalars().all()
        by_normalized = {}
        for p in profiles:
            normalized = normalize_social_url(p.social_url)
            if not normalized:
                await session.delete(p)
                duplicates_removed += 1
                continue
            by_normalized.setdefault(normalized, []).append(p)
        for normalized, group in by_normalized.items():
            group.sort(key=lambda x: (x.crawl_timestamp, x.confidence_score), reverse=True)
            primary = group[0]
            duplicates = group[1:]
            primary.social_url = normalized
            primary.validation_status = "VALID"
            session.add(primary)
            for dup in duplicates:
                await session.delete(dup)
                duplicates_removed += 1

        # Deduplicate pages
        for model_class, url_field in models_to_clean:
            stmt = select(model_class).where(model_class.lead_id == lead_id)
            res = await session.execute(stmt)
            items = res.scalars().all()
            by_normalized = {}
            for item in items:
                normalized = normalize_social_url(getattr(item, url_field))
                if not normalized:
                    await session.delete(item)
                    duplicates_removed += 1
                    continue
                by_normalized.setdefault(normalized, []).append(item)
            for normalized, group in by_normalized.items():
                group.sort(key=lambda x: (x.crawl_timestamp, getattr(x, "confidence_score", 1.0)), reverse=True)
                primary = group[0]
                duplicates = group[1:]
                setattr(primary, url_field, normalized)
                session.add(primary)
                for dup in duplicates:
                    await session.delete(dup)
                    duplicates_removed += 1

    await session.commit()
    return duplicates_removed


class CrawlerRunner(BaseRunner):
    """
    Real web crawler that crawls websites and stores all discovered contacts in normalized tables.
    Deduplicates leads by domain.
    """
    async def run(self, workspace_id: str, lead_id: str = None, log_callback=None) -> Dict[str, Any]:
        self.start_timing()
        self.log_event(20, f"Initializing web crawler on workspace targets: {workspace_id}")

        # Run duplicate cleanup first to ensure clean lead records
        await deduplicate_workspace_leads(self.session, workspace_id)
        dups_removed = await deduplicate_workspace_social_links(self.session, workspace_id)

        if lead_id:
            statement = select(Lead).where(Lead.id == lead_id)
        else:
            # Only process pending DISCOVERED leads with a valid website
            statement = select(Lead).where(
                Lead.workspace_id == workspace_id,
                Lead.status == "DISCOVERED",
                Lead.website != None,
                Lead.website != ""
            )

        result = await self.session.exec(statement)
        leads = result.all()

        signals_created = 0
        crawler_logs = []
        crawler = WebCrawler(timeout=10)

        for lead in leads:
            # Skip leads without website URL
            if not lead.website:
                self.log_event(20, f"Skipping {lead.company_name} - no website URL provided")
                crawler_logs.append(f"Skipped {lead.company_name} - no website data")
                continue

            import uuid
            job_id = str(uuid.uuid4())
            # Create a CrawlJob
            job = CrawlJob(
                id=job_id,
                url=lead.website,
                status="crawling",
                lead_id=lead.id,
                created_at=datetime.now(timezone.utc).replace(tzinfo=None),
                updated_at=datetime.now(timezone.utc).replace(tzinfo=None),
            )
            self.session.add(job)
            await self.session.commit()

            self.log_event(20, f"Crawling website: {lead.website} ({lead.company_name})")
            msg = f"Processing {company_domain}" if 'company_domain' in locals() else f"Processing {lead.website}"
            if log_callback:
                log_callback(msg)
            crawler_logs.append(msg)
            if log_callback:
                log_callback(f"Crawl started for {lead.company_name}")
            crawler_logs.append(f"Crawl started for {lead.company_name}")

            if lead.status == "DISCOVERED":
                lead.status = "CRAWLED"
            self.session.add(lead)

            # Run the enhanced recursive crawler (max_pages=50)
            if log_callback:
                log_callback(f"Crawl started for {lead.company_name} (website: {lead.website})")
            
            async def bg_log_cb(msg: str, crawled: int, total: int):
                if log_callback:
                    log_callback(msg)
                crawler_logs.append(msg)
                
            crawl_dict = await crawler.crawl_live_site(lead.website, log_callback=bg_log_cb)
            
            if not crawl_dict.get("success"):
                job.status = "failed"
                job.error_message = crawl_dict.get("error_message") or "Crawl failed"
                job.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
                self.session.add(job)
                await self.session.commit()
                self.log_event(30, f"Crawl failed for {lead.company_name}: {job.error_message}")
                continue
                
            # Build CrawlResult object from crawl_dict for backward compatibility with the rest of the runner
            from app.runners.web_crawler import CrawlResult
            crawl_result = CrawlResult(
                website_url=lead.website,
                page_title=crawl_dict.get("seo_title") or crawl_dict.get("company_name"),
                seo_description=crawl_dict.get("seo_description"),
                seo_title=crawl_dict.get("seo_title"),
                description=crawl_dict.get("description"),
                emails=set(crawl_dict.get("emails", [])),
                phone_numbers=set(crawl_dict.get("phone_numbers", [])),
                social_profiles=set(crawl_dict.get("social_profiles", [])),
                contact_pages=set(crawl_dict.get("contact_pages", [])),
                about_pages=set(crawl_dict.get("about_pages", [])),
                support_pages=set(crawl_dict.get("support_pages", [])),
                careers_pages=set(crawl_dict.get("careers_pages", [])),
                product_pages=set(crawl_dict.get("product_pages", [])),
                blog_pages=set(crawl_dict.get("blog_pages", [])),
                press_pages=set(crawl_dict.get("press_pages", [])),
                pricing_pages=set(crawl_dict.get("pricing_pages", [])),
                legal_pages=set(crawl_dict.get("legal_pages", [])),
                docs_pages=set(crawl_dict.get("docs_pages", [])),
                integration_pages=set(crawl_dict.get("integration_pages", [])),
                technologies=set(crawl_dict.get("technologies", [])),
                job_count=crawl_dict.get("job_count", 0),
                job_listings=crawl_dict.get("job_listings", []),
                visited_pages=crawl_dict.get("visited_pages", []),
                crawl_logs=crawl_dict.get("crawl_logs", []),
                pages_crawled=crawl_dict.get("pages_crawled", 0),
                pages_total=crawl_dict.get("pages_total", 0),
                success=crawl_dict.get("success", False),
                error_message=crawl_dict.get("error_message"),
                company_name=crawl_dict.get("company_name"),
                industry=crawl_dict.get("industry"),
                country=crawl_dict.get("country"),
                city=crawl_dict.get("city"),
                state=crawl_dict.get("state"),
                postal_code=crawl_dict.get("postal_code"),
                full_address=crawl_dict.get("full_address"),
                latitude=crawl_dict.get("latitude"),
                longitude=crawl_dict.get("longitude")
            )
            
            pages_visited = crawl_result.visited_pages or [lead.website]

            # Normalize company domain
            company_domain = normalize_domain(lead.website)

            # Accumulator dictionaries to deduplicate and store discovery metadata
            discovered_emails = {}
            discovered_phones = {}
            discovered_profiles = {}
            discovered_contacts = {}
            discovered_abouts = {}
            discovered_supports = {}
            discovered_careers = {}
            discovered_products = {}

            # Process crawl results
            for e in crawl_result.emails:
                discovered_emails[e] = {
                    "source_url": lead.website,
                    "discovery_page": lead.website,
                    "confidence": calculate_email_confidence(e, company_domain)
                }

            for p in crawl_result.phone_numbers:
                discovered_phones[p] = {
                    "source_url": lead.website,
                    "discovery_page": lead.website,
                    "confidence": 1.0
                }

            for u in crawl_result.social_profiles:
                normalized = normalize_social_url(u)
                if normalized and validate_social_url(normalized):
                    discovered_profiles[normalized] = {
                        "source_url": lead.website,
                        "discovery_page": lead.website,
                        "network": determine_network(normalized),
                        "confidence": 0.95
                    }

            for u in crawl_result.contact_pages:
                normalized = normalize_social_url(u)
                if normalized:
                    discovered_contacts[normalized] = {
                        "source_url": lead.website,
                        "discovery_page": lead.website,
                        "confidence": 1.0
                    }

            for u in crawl_result.about_pages:
                normalized = normalize_social_url(u)
                if normalized:
                    discovered_abouts[normalized] = {
                        "source_url": lead.website,
                        "discovery_page": lead.website,
                        "confidence": 1.0
                    }

            for u in crawl_result.support_pages:
                normalized = normalize_social_url(u)
                if normalized:
                    discovered_supports[normalized] = {
                        "source_url": lead.website,
                        "discovery_page": lead.website,
                        "confidence": 1.0
                    }

            for u in crawl_result.careers_pages:
                normalized = normalize_social_url(u)
                if normalized:
                    discovered_careers[normalized] = {
                        "source_url": lead.website,
                        "discovery_page": lead.website,
                        "confidence": 1.0
                    }

            for u in crawl_result.product_pages:
                normalized = normalize_social_url(u)
                if normalized:
                    discovered_products[normalized] = {
                        "source_url": lead.website,
                        "discovery_page": lead.website,
                        "confidence": 1.0
                    }

            first_new_email = None
            first_new_phone = None

            emails_inserted = 0
            emails_updated = 0
            phones_inserted = 0
            phones_updated = 0
            social_inserted = 0
            social_updated = 0
            pages_inserted = 0
            pages_updated = 0

            # Persist emails
            for email_str, meta in discovered_emails.items():
                stmt = select(LeadEmail).where(LeadEmail.email == email_str)
                exists = (await self.session.exec(stmt)).first()
                if not exists:
                    email_obj = LeadEmail(
                        lead_id=lead.id,
                        email=email_str,
                        source_url=meta["source_url"],
                        discovery_page=meta["discovery_page"],
                        crawl_timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
                        confidence_score=meta["confidence"]
                    )
                    self.session.add(email_obj)
                    emails_inserted += 1
                    if not first_new_email:
                        first_new_email = email_str
                    if log_callback:
                        log_callback(f"1 email found: {email_str}")
                else:
                    emails_updated += 1

            # Persist phones
            for phone_str, meta in discovered_phones.items():
                stmt = select(LeadPhone).where(LeadPhone.phone == phone_str)
                exists = (await self.session.exec(stmt)).first()
                if not exists:
                    phone_obj = LeadPhone(
                        lead_id=lead.id,
                        phone=phone_str,
                        source_url=meta["source_url"],
                        discovery_page=meta["discovery_page"],
                        crawl_timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
                        confidence_score=meta["confidence"]
                    )
                    self.session.add(phone_obj)
                    phones_inserted += 1
                    if not first_new_phone:
                        first_new_phone = phone_str
                    if log_callback:
                        log_callback(f"1 phone number found: {phone_str}")
                else:
                    phones_updated += 1

            # Persist social profiles
            for link_str, meta in discovered_profiles.items():
                stmt = select(LeadSocialProfile).where(
                    LeadSocialProfile.lead_id == lead.id,
                    LeadSocialProfile.social_url == link_str
                )
                exists = (await self.session.exec(stmt)).first()
                if exists:
                    exists.crawl_timestamp = datetime.now(timezone.utc).replace(tzinfo=None)
                    exists.discovery_page = meta["discovery_page"]
                    exists.confidence_score = meta["confidence"]
                    exists.validation_status = "VALID"
                    self.session.add(exists)
                    social_updated += 1
                else:
                    profile_obj = LeadSocialProfile(
                        lead_id=lead.id,
                        social_url=link_str,
                        network=meta["network"],
                        source_url=meta["source_url"],
                        discovery_page=meta["discovery_page"],
                        crawl_timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
                        confidence_score=meta["confidence"],
                        validation_status="VALID"
                    )
                    self.session.add(profile_obj)
                    social_inserted += 1
                    if log_callback:
                        log_callback(f"Contact found: {link_str}")

            # Persist other pages
            models_to_persist = [
                (discovered_contacts, LeadContactPage),
                (discovered_abouts, LeadAboutPage),
                (discovered_supports, LeadSupportPage),
                (discovered_careers, LeadCareersPage),
                (discovered_products, LeadProductPage),
            ]

            for disc_dict, model_class in models_to_persist:
                for link_str, meta in disc_dict.items():
                    stmt = select(model_class).where(
                        model_class.lead_id == lead.id,
                        model_class.url == link_str
                    )
                    exists = (await self.session.exec(stmt)).first()
                    if exists:
                        exists.crawl_timestamp = datetime.now(timezone.utc).replace(tzinfo=None)
                        exists.discovery_page = meta["discovery_page"]
                        exists.confidence_score = meta["confidence"]
                        self.session.add(exists)
                        pages_updated += 1
                    else:
                        page_obj = model_class(
                            lead_id=lead.id,
                            url=link_str,
                            source_url=meta["source_url"],
                            discovery_page=meta["discovery_page"],
                            crawl_timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
                            confidence_score=meta["confidence"]
                        )
                        self.session.add(page_obj)
                        pages_inserted += 1

            import json as json_lib
            # Update lead metadata from crawl
            if crawl_result.company_name and (not lead.company_name or lead.company_name == company_domain):
                lead.company_name = crawl_result.company_name
            lead.description = crawl_result.description or lead.description
            lead.seo_title = crawl_result.seo_title or lead.seo_title
            lead.seo_description = crawl_result.seo_description or lead.seo_description
            if crawl_result.technologies:
                lead.technologies = json_lib.dumps(sorted(list(crawl_result.technologies)))
            lead.job_count = crawl_result.job_count
            if crawl_result.job_listings:
                lead.job_listings = json_lib.dumps(crawl_result.job_listings)
            lead.pages_crawled = crawl_result.pages_crawled
            
            # Normalize and update location
            def local_norm_country(val) -> Optional[str]:
                if not val or val.strip().lower() in ("", "unknown", "n/a", "na", "none"):
                    return None
                from app.runners.web_crawler import COUNTRIES_NORMALIZATION
                return COUNTRIES_NORMALIZATION.get(val.strip().lower(), val.strip().title())
                
            def local_norm_city(val) -> Optional[str]:
                if not val or val.strip().lower() in ("", "unknown", "n/a", "na", "none"):
                    return None
                city_map = {
                    "bangalore": "Bengaluru", "bengaluru": "Bengaluru",
                    "bombay": "Mumbai", "mumbai": "Mumbai",
                    "madras": "Chennai", "chennai": "Chennai",
                    "calcutta": "Kolkata", "kolkata": "Kolkata",
                    "new delhi": "New Delhi", "delhi": "New Delhi",
                }
                return city_map.get(val.strip().lower(), val.strip().title())

            new_country = local_norm_country(crawl_result.country)
            new_city = local_norm_city(crawl_result.city)
            if new_country and new_country != "Unknown":
                lead.country = new_country
            if new_city and new_city != "Unknown":
                lead.city = new_city
            if crawl_result.state and crawl_result.state != "Unknown":
                lead.state = crawl_result.state
            if crawl_result.postal_code:
                lead.postal_code = crawl_result.postal_code
            if crawl_result.full_address:
                lead.full_address = crawl_result.full_address
            if crawl_result.latitude is not None:
                lead.latitude = crawl_result.latitude
            if crawl_result.longitude is not None:
                lead.longitude = crawl_result.longitude

            # Update backward-compatibility primary email/phone
            if not lead.email and first_new_email:
                lead.email = first_new_email
            elif not lead.email and discovered_emails:
                lead.email = next(iter(discovered_emails.keys()))

            if not lead.phone and first_new_phone:
                lead.phone = first_new_phone
            elif not lead.phone and discovered_phones:
                lead.phone = next(iter(discovered_phones.keys()))

            lead.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
            self.session.add(lead)

            # Generate intent signals from crawl results
            all_social_links = set(discovered_profiles.keys()) | set(discovered_contacts.keys()) | set(discovered_abouts.keys()) | set(discovered_supports.keys()) | set(discovered_careers.keys()) | set(discovered_products.keys())
            generated_signals = self._generate_signals_from_crawl(
                lead.id,
                lead.company_name,
                emails=set(discovered_emails.keys()),
                phone_numbers=set(discovered_phones.keys()),
                social_links=all_social_links,
                page_title=crawl_result.page_title or ""
            )

            for signal in generated_signals:
                self.session.add(signal)
                signals_created += 1

            # Update CrawlJob to completed
            job.status = "completed"
            job.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
            self.session.add(job)
            await self.session.commit()

            total_inserts = emails_inserted + phones_inserted + social_inserted + pages_inserted
            total_updates = emails_updated + phones_updated + social_updated + pages_updated

            crawler_logs.append(f"[Crawl Ingestion] Pages Visited: {', '.join(pages_visited)}")
            crawler_logs.append(f"[Crawl Ingestion] Social Profiles Discovered: {', '.join(discovered_profiles.keys()) or 'None'}")
            crawler_logs.append(f"[Crawl Ingestion] Contact/Other Pages Discovered: {', '.join(list(discovered_contacts.keys()) + list(discovered_abouts.keys())) or 'None'}")
            crawler_logs.append(f"[Crawl Ingestion] Records Inserted: {emails_inserted} emails, {phones_inserted} phones, {social_inserted} profiles, {pages_inserted} pages")
            crawler_logs.append(f"[Crawl Ingestion] Records Updated: {emails_updated} emails, {phones_updated} phones, {social_updated} profiles, {pages_updated} pages")
            crawler_logs.append(f"[Crawl Ingestion] Deduplication: Cleaned up {dups_removed} duplicates workspace-wide. Crawl Job ID: {job_id} status: {job.status}")
            crawler_logs.append(f"✓ Crawl successful: extracted {len(discovered_emails)} emails, "
                               f"{len(discovered_phones)} phone numbers, "
                               f"{len(discovered_profiles)} social profiles, "
                               f"{len(discovered_contacts) + len(discovered_abouts) + len(discovered_supports) + len(discovered_careers) + len(discovered_products)} pages")

        await self.session.commit()
        latency = self.end_timing()

        self.log_event(20, f"Crawler pass finished. Created {signals_created} signals in {latency:.3f}s.")
        return {
            "status": "COMPLETED",
            "signals_created": signals_created,
            "latency_sec": latency,
            "logs": crawler_logs
        }

    @staticmethod
    def _generate_signals_from_crawl(lead_id: str, company_name: str, emails: set, phone_numbers: set, social_links: set, page_title: str) -> list:
        """Generate intent signals based on crawl results."""
        signals = []

        # Signal: Website accessible
        signals.append(IntentSignal(
            lead_id=lead_id,
            signal_type="Website Accessible",
            volume=1,
            intensity="Medium"
        ))

        # Signal: Page title detected
        if page_title:
            signals.append(IntentSignal(
                lead_id=lead_id,
                signal_type="Active Web Presence",
                volume=1,
                intensity="Medium"
            ))

        # Signal: Contact information found
        if emails:
            signals.append(IntentSignal(
                lead_id=lead_id,
                signal_type="Contact Email Found",
                volume=len(emails),
                intensity="High"
            ))

        # Signal: Phone number found
        if phone_numbers:
            signals.append(IntentSignal(
                lead_id=lead_id,
                signal_type="Phone Number Found",
                volume=len(phone_numbers),
                intensity="High"
            ))

        # Signal: Social presence
        if social_links:
            signals.append(IntentSignal(
                lead_id=lead_id,
                signal_type="Social Media Links",
                volume=len(social_links),
                intensity="Medium"
            ))

        return signals
