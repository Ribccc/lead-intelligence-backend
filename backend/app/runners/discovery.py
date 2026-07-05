import logging
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlmodel import select
from sqlalchemy import func
from app.runners.base import BaseRunner
from app.runners.crawler import normalize_domain
from app.models.lead import Lead, LeadEmail, LeadPhone, LeadSocialLink

logger = logging.getLogger(__name__)

# STARTUP_REGISTRY is disabled and set to empty to prove the engine works solely on real runtime sources
STARTUP_REGISTRY = []


def parse_country(regions: List[str], location: str) -> str:
    loc_str = (location or "").lower()
    regs = [r.lower() for r in (regions or [])]
    
    if "united states" in regs or "usa" in regs or "united states" in loc_str or "san francisco" in loc_str or "california" in loc_str:
        return "US"
    if "canada" in regs or "canada" in loc_str:
        return "CA"
    if "united kingdom" in regs or "uk" in regs or "united kingdom" in loc_str or "england" in loc_str or "london" in loc_str:
        return "GB"
    if "india" in regs or "india" in loc_str or "bangalore" in loc_str:
        return "IN"
    if "germany" in regs or "germany" in loc_str or "berlin" in loc_str:
        return "DE"
    if "france" in regs or "france" in loc_str or "paris" in loc_str:
        return "FR"
    if "netherlands" in regs or "netherlands" in loc_str or "amsterdam" in loc_str:
        return "NL"
    if "australia" in regs or "australia" in loc_str or "sydney" in loc_str:
        return "AU"
    if "singapore" in regs or "singapore" in loc_str:
        return "SG"
    if "japan" in regs or "japan" in loc_str or "tokyo" in loc_str:
        return "JP"
    if "sweden" in regs or "sweden" in loc_str or "stockholm" in loc_str:
        return "SE"
    
    for r in regions or []:
        if len(r) == 2:
            return r.upper()
    return "US"


def map_revenue_range(employees: int) -> str:
    if employees < 20:
        return "$1M-$5M"
    elif employees < 100:
        return "$5M-$20M"
    elif employees < 500:
        return "$20M-$100M"
    else:
        return "$100M+"


def map_funding(stage: str) -> str:
    if not stage:
        return "$2M (Seed)"
    if stage.lower() == "early":
        return "$2M (Seed)"
    elif stage.lower() == "growth":
        return "$15M (Series A)"
    elif stage.lower() == "late":
        return "$50M (Series B)"
    return f"Passed stage: {stage}"


def parse_city_state(location: str, country: str) -> tuple[Optional[str], Optional[str]]:
    if not location:
        return None, None
    parts = [p.strip() for p in location.split(",")]
    if not parts:
        return None, None
    
    city = parts[0]
    state = None
    
    if country in ("US", "CA"):
        if len(parts) >= 3:
            state = parts[1]
        elif len(parts) == 2:
            state = parts[1]
    return city, state


class LeadDiscoveryEngine(BaseRunner):
    """
    Performs runtime startup discovery scanning the live YC OSS API endpoint.
    Filters results based on: country, state, city, industry, employees, funding stage, and revenue range.
    Adds discovered leads automatically and returns workspace metrics.
    """

    async def run(self, workspace_id: str, **kwargs) -> Dict[str, Any]:
        """Execute discovery by delegating to run_discovery."""
        return await self.run_discovery(
            workspace_id=workspace_id,
            country=kwargs.get("country"),
            state=kwargs.get("state"),
            city=kwargs.get("city"),
            industry=kwargs.get("industry"),
            min_employees=kwargs.get("min_employees"),
            max_employees=kwargs.get("max_employees"),
            funding_stage=kwargs.get("funding_stage"),
            revenue_range=kwargs.get("revenue_range"),
        )

    async def run_discovery(
        self,
        workspace_id: str,
        country: Optional[str] = None,
        state: Optional[str] = None,
        city: Optional[str] = None,
        industry: Optional[str] = None,
        min_employees: Optional[int] = None,
        max_employees: Optional[int] = None,
        funding_stage: Optional[str] = None,
        revenue_range: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Perform discovery using live YC OSS data and return discovered company targets."""
        # 1. Fetch current leads in this workspace to prevent duplicates
        stmt = select(Lead).where(Lead.workspace_id == workspace_id)
        current_leads_res = await self.session.exec(stmt)
        current_leads = current_leads_res.all()
        existing_domains = {normalize_domain(l.website) for l in current_leads if l.website}

        discovered_companies = []
        newly_added_count = 0
        limit = 15  # Limit maximum automated queue crawl size to prevent resource exhaustion

        # 2. Make live HTTP request to the YC OSS directory endpoint
        source_url = "https://yc-oss.github.io/api/companies/all.json"
        logger.info(f"[LeadDiscoveryEngine] Initiating live outbound HTTP GET request to: {source_url}")
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(source_url)
                response.raise_for_status()
                data = response.json()
            logger.info(f"[LeadDiscoveryEngine] Successfully fetched {len(data)} companies from YC OSS API.")
        except Exception as e:
            logger.error(f"[LeadDiscoveryEngine] Failed outbound HTTP fetch from {source_url}: {e}")
            data = []

        # 3. Iterate, filter, and queue
        for item in data:
            if newly_added_count >= limit:
                break

            name = item.get("name")
            website = item.get("website")
            if not name or not website:
                continue

            # Check for duplicate domains
            domain = normalize_domain(website)
            if domain in existing_domains:
                continue

            # Country Filter
            regions = item.get("regions") or []
            location = item.get("all_locations") or ""
            item_country = parse_country(regions, location)
            if country and item_country.upper() != country.upper():
                continue

            # City & State Filtering
            item_city, item_state = parse_city_state(location, item_country)
            if state and (not item_state or state.lower() not in item_state.lower()):
                continue
            if city and (not item_city or city.lower() not in item_city.lower()):
                continue

            # Industry/Sector Filter
            item_industry = item.get("industry") or "Technology"
            item_subindustry = item.get("subindustry") or "SaaS"
            if industry:
                ind_match = (industry.lower() in item_industry.lower()) or (industry.lower() in item_subindustry.lower())
                if not ind_match:
                    continue

            # Employee Count Filter
            team_size = item.get("team_size") or 0
            if min_employees and team_size < min_employees:
                continue
            if max_employees and team_size > max_employees:
                continue

            # Funding Stage Filter
            stage = item.get("stage") or ""
            if funding_stage:
                if funding_stage.lower() not in stage.lower():
                    continue

            # Revenue Range Filter
            rev_range = map_revenue_range(team_size)
            if revenue_range and rev_range != revenue_range:
                continue

            # In-Memory collection
            newly_added_count += 1
            discovered_companies.append({
                "name": name,
                "website": website,
                "source": "YC companies",
                "country": item_country,
                "city": item_city,
                "state": item_state,
                "industry": item_industry,
                "subindustry": item_subindustry,
                "employees": team_size,
                "stage": stage,
            })

        # 5. Compute metrics stats for the workspace
        stats = await self.compute_workspace_stats(workspace_id)

        return {
            "companies": discovered_companies,
            "stats": stats
        }

    async def compute_workspace_stats(self, workspace_id: str) -> Dict[str, Any]:
        """Compute metrics stats for the given workspace."""
        # A. Total companies discovered (status = DISCOVERED)
        total_stmt = select(func.count(Lead.id)).where(
            Lead.workspace_id == workspace_id,
            Lead.status.in_(["DISCOVERED", "CRAWLED", "ENRICHED"])
        )
        total_discovered = (await self.session.exec(total_stmt)).first() or 0

        # B. Newly added today (created_at matches today's date)
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
        added_stmt = select(func.count(Lead.id)).where(
            Lead.workspace_id == workspace_id,
            Lead.created_at >= today_start
        )
        new_added_today = (await self.session.exec(added_stmt)).first() or 0

        # C. Contact count (sum of lead_emails + lead_phones + lead_social_links)
        leads_stmt = select(Lead.id).where(Lead.workspace_id == workspace_id)
        lead_ids = (await self.session.exec(leads_stmt)).all()

        contact_count = 0
        if lead_ids:
            emails_stmt = select(func.count(LeadEmail.id)).where(LeadEmail.lead_id.in_(lead_ids))
            phones_stmt = select(func.count(LeadPhone.id)).where(LeadPhone.lead_id.in_(lead_ids))
            socials_stmt = select(func.count(LeadSocialLink.id)).where(LeadSocialLink.lead_id.in_(lead_ids))

            emails_c = (await self.session.exec(emails_stmt)).first() or 0
            phones_c = (await self.session.exec(phones_stmt)).first() or 0
            socials_c = (await self.session.exec(socials_stmt)).first() or 0
            contact_count = emails_c + phones_c + socials_c

        # D. Enrichment status (percentage of leads in ENRICHED or QUALIFIED status)
        all_leads_stmt = select(func.count(Lead.id)).where(Lead.workspace_id == workspace_id)
        total_leads = (await self.session.exec(all_leads_stmt)).first() or 0

        enriched_stmt = select(func.count(Lead.id)).where(
            Lead.workspace_id == workspace_id,
            Lead.status.in_(["ENRICHED", "QUALIFIED"])
        )
        enriched_leads = (await self.session.exec(enriched_stmt)).first() or 0

        enrichment_rate = 0.0
        if total_leads > 0:
            enrichment_rate = round((enriched_leads / total_leads) * 100, 1)

        return {
            "totalDiscovered": total_discovered,
            "newAddedToday": new_added_today,
            "contactCount": contact_count,
            "enrichmentRate": enrichment_rate
        }
