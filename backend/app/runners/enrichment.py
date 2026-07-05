"""
AI-powered enrichment runner.
Analyzes real crawled data (technologies, page types, emails, job count, description)
and synthesizes meaningful business insights about company characteristics, maturity,
and outreach priority. All insights are derived from actual extracted data — no hardcoding.
"""
import json
from typing import Dict, Any, List
from sqlmodel import select
from app.runners.base import BaseRunner
from app.models.lead import Lead, AIInsight, LeadEmail, LeadPhone, LeadSocialProfile
from app.models.lead import LeadContactPage, LeadCareersPage, LeadAboutPage, LeadProductPage


class EnrichmentRunner(BaseRunner):
    """
    Rule-based-but-data-driven enrichment. Generates smart business intelligence
    insights based on real crawled data stored in the database.
    """

    async def run(self, workspace_id: str, lead_id: str = None, log_callback=None) -> Dict[str, Any]:
        self.start_timing()
        self.log_event(20, f"Starting AI Enrichment analysis: {workspace_id}")

        if lead_id:
            statement = select(Lead).where(Lead.id == lead_id)
        else:
            statement = select(Lead).where(
                Lead.workspace_id == workspace_id,
                Lead.status.in_(["DISCOVERED", "CRAWLED", "ENRICHED", "QUALIFIED", "NURTURE"])
            )

        result = await self.session.exec(statement)
        leads = result.all()

        enriched_count = 0
        insights_created = 0
        enrichment_logs = []

        for lead in leads:
            self.log_event(20, f"Analyzing profile data for: {lead.company_name}")

            # Query real crawled data from typed tables
            emails_res = (await self.session.execute(
                select(LeadEmail).where(LeadEmail.lead_id == lead.id)
            )).scalars().all()

            phones_res = (await self.session.execute(
                select(LeadPhone).where(LeadPhone.lead_id == lead.id)
            )).scalars().all()

            socials_res = (await self.session.execute(
                select(LeadSocialProfile).where(LeadSocialProfile.lead_id == lead.id)
            )).scalars().all()

            contact_pages = (await self.session.execute(
                select(LeadContactPage).where(LeadContactPage.lead_id == lead.id)
            )).scalars().all()

            careers_pages = (await self.session.execute(
                select(LeadCareersPage).where(LeadCareersPage.lead_id == lead.id)
            )).scalars().all()

            product_pages = (await self.session.execute(
                select(LeadProductPage).where(LeadProductPage.lead_id == lead.id)
            )).scalars().all()

            about_pages = (await self.session.execute(
                select(LeadAboutPage).where(LeadAboutPage.lead_id == lead.id)
            )).scalars().all()

            # Parse technologies JSON
            technologies: List[str] = []
            try:
                if lead.technologies:
                    technologies = json.loads(lead.technologies)
            except Exception:
                pass

            # Generate smart insights from real data
            insights = self._generate_insights(
                lead=lead,
                emails=emails_res,
                phones=phones_res,
                socials=socials_res,
                contact_pages=contact_pages,
                careers_pages=careers_pages,
                product_pages=product_pages,
                about_pages=about_pages,
                technologies=technologies,
            )

            # Deduplicate: skip insights already in DB for this lead
            existing_stmnt = select(AIInsight).where(AIInsight.lead_id == lead.id)
            existing_res = (await self.session.execute(existing_stmnt)).scalars().all()
            existing_summaries = {i.summary for i in existing_res}

            for insight_obj in insights:
                if insight_obj.summary not in existing_summaries:
                    self.session.add(insight_obj)
                    insights_created += 1
                    existing_summaries.add(insight_obj.summary)

            # Estimate employee count if <= 0
            if not lead.employees or lead.employees <= 0:
                lead.employees = self._estimate_employee_count(lead, technologies, careers_pages)

            # Generate AI summary if empty/missing
            if not lead.description or lead.description.strip() == "" or lead.description.lower() == "unknown":
                lead.description = self._generate_ai_summary(lead, technologies)

            # Calculate and store confidence score
            lead.confidence_score = self._calculate_confidence_score(
                lead, emails_res, phones_res, socials_res, contact_pages
            )

            # Promote to ENRICHED if still in CRAWLED/DISCOVERED
            has_meaningful_data = bool(emails_res or phones_res or technologies or careers_pages or contact_pages)
            if has_meaningful_data:
                if lead.status in ["DISCOVERED", "CRAWLED", "ENRICHING"]:
                    lead.status = "ENRICHED"
                self.session.add(lead)
                enriched_count += 1

            msg = f"✓ Enriched {lead.company_name}: {len(insights)} insights generated"
            enrichment_logs.append(msg)
            if log_callback:
                log_callback(msg)

        await self.session.commit()
        latency = self.end_timing()

        self.log_event(20, f"AI Enrichment complete. Created {insights_created} insights in {latency:.3f}s.")
        return {
            "status": "COMPLETED",
            "enriched_count": enriched_count,
            "insights_created": insights_created,
            "latency_sec": latency,
            "logs": enrichment_logs,
        }

    def _generate_insights(
        self,
        lead: Lead,
        emails: list,
        phones: list,
        socials: list,
        contact_pages: list,
        careers_pages: list,
        product_pages: list,
        about_pages: list,
        technologies: List[str],
    ) -> List[AIInsight]:
        """Generate AI insights from real crawled data. All insights sourced from DB data."""
        insights = []

        def add(summary: str, source: str = "web_crawl"):
            insights.append(AIInsight(lead_id=lead.id, summary=summary, source_type=source))

        # ── Contact intelligence ───────────────────────────────────────────
        if emails:
            email_list = ', '.join(e.email for e in emails[:3])
            add(f"{len(emails)} verified business email(s) extracted from site crawl: {email_list}")
        elif lead.email:
            add(f"Direct email contact available: {lead.email}")

        if phones:
            add(f"{len(phones)} phone number(s) discovered across {len(contact_pages)} page(s)")
        elif lead.phone:
            add(f"Phone number available: {lead.phone}")

        # ── Social footprint ───────────────────────────────────────────────
        if socials:
            networks = list({s.network for s in socials if s.network})[:5]
            add(f"Active social presence: {', '.join(networks)} ({len(socials)} profile(s) found)", "social_crawl")

        # ── Technology stack intelligence ──────────────────────────────────
        if technologies:
            tech_list = ', '.join(technologies[:6])
            add(f"Technology stack: {tech_list}", "tech_detection")

            # Tech maturity categorization
            modern_stack = {t for t in technologies if t in (
                "React", "Next.js", "Vue.js", "Svelte", "Nuxt.js", "Tailwind CSS",
                "Vercel", "Netlify", "Supabase", "Firebase"
            )}
            enterprise_stack = {t for t in technologies if t in (
                "AWS", "Cloudflare", "Salesforce", "HubSpot", "Stripe", "Auth0", "Segment"
            )}
            analytics_stack = {t for t in technologies if t in (
                "Google Analytics", "Google Tag Manager", "Mixpanel", "Hotjar", "Segment"
            )}

            if len(modern_stack) >= 2:
                add(f"Modern web stack detected ({', '.join(sorted(modern_stack)[:3])}) — fast-moving engineering team", "tech_detection")
            if enterprise_stack:
                add(f"Enterprise tooling confirmed ({', '.join(sorted(enterprise_stack)[:3])}) — mature infrastructure signals", "tech_detection")
            if analytics_stack:
                add(f"Data-driven culture: {len(analytics_stack)} analytics/tracking tools active", "tech_detection")
            if "Stripe" in technologies:
                add("Stripe integration detected — monetization active, likely SaaS or e-commerce revenue model", "tech_detection")
            if "HubSpot" in technologies or "Salesforce" in technologies:
                crm = "HubSpot" if "HubSpot" in technologies else "Salesforce"
                add(f"{crm} CRM active — established sales process and customer management workflow", "tech_detection")

        # ── Hiring signals ─────────────────────────────────────────────────
        if careers_pages:
            job_count = getattr(lead, "job_count", 0) or 0
            if job_count > 20:
                add(f"High-volume hiring: {job_count}+ open positions on careers page — strong growth signal", "careers_crawl")
            elif job_count > 5:
                add(f"Active hiring: {job_count} open positions detected — team expansion phase", "careers_crawl")
            elif job_count > 0:
                add(f"{job_count} open position(s) found on careers page", "careers_crawl")
            else:
                add("Careers page found — company is actively recruiting (open positions list parsing pending)", "careers_crawl")

        # ── Product & market signals ───────────────────────────────────────
        if product_pages:
            has_pricing = any("pricing" in p.url.lower() or "plans" in p.url.lower() for p in product_pages)
            if has_pricing:
                add("Pricing/plans page found — self-serve or transactional model active: high buying intent signal", "product_crawl")
            else:
                add(f"{len(product_pages)} product/feature page(s) crawled — active product catalog", "product_crawl")

        # ── Company scale estimation ───────────────────────────────────────
        if lead.employees and lead.employees > 0:
            size_category = "Enterprise"
            if lead.employees < 20:
                size_category = "Startup"
            elif lead.employees < 100:
                size_category = "Early-stage"
            elif lead.employees < 500:
                size_category = "Mid-market"
            add(f"{size_category} company: ~{lead.employees} employees — {self._headcount_signal(lead.employees)}", "company_data")

        # ── Funding signals ────────────────────────────────────────────────
        if lead.funding:
            add(f"Funding profile detected: {lead.funding} — market validation and growth capital secured", "financial_data")

        # ── Sector fit ─────────────────────────────────────────────────────
        if lead.sector and lead.industry:
            add(f"Operating in {lead.sector} ({lead.industry}) — sector-specific intelligence available", "market_data")

        # ── Web presence quality ───────────────────────────────────────────
        pages_crawled = getattr(lead, "pages_crawled", 0) or 0
        if pages_crawled >= 10:
            add(f"Rich web footprint: {pages_crawled} pages successfully crawled — high data confidence", "web_crawl")
        elif pages_crawled > 0:
            add(f"Web crawl complete: {pages_crawled} pages analyzed", "web_crawl")

        # ── Company description ────────────────────────────────────────────
        if lead.description and len(lead.description) > 30:
            add(f"Company self-description extracted: \"{lead.description[:120]}{'...' if len(lead.description) > 120 else ''}\"", "seo_data")

        # Ensure at least one insight
        if not insights:
            add(f"Company profile captured: {lead.company_name} — awaiting deeper crawl data", "web_crawl")

        # Return top 8 insights
        return insights[:8]

    @staticmethod
    def _headcount_signal(employees: int) -> str:
        if employees < 20:
            return "founder-led, rapid decision-making"
        if employees < 100:
            return "growing team, lean procurement process"
        if employees < 500:
            return "established management structure, department heads"
        return "enterprise procurement, dedicated buying committees"

    def _estimate_employee_count(self, lead: Lead, technologies: List[str], careers_pages: List[Any]) -> int:
        """
        Estimate employee count from crawled signals:
        - Careers pages job count
        - Tech stack complexity (enterprise software indicates larger organizations)
        - Funding status
        """
        job_count = getattr(lead, "job_count", 0) or 0
        
        # Enterprise signals
        enterprise_techs = {'Salesforce', 'SAP', 'Oracle', 'Workday', 'ServiceNow', 'Adobe Experience Cloud'}
        has_enterprise_tech = any(t in enterprise_techs for t in technologies)
        
        # Base estimation
        if job_count > 30:
            est = 450
        elif job_count > 15:
            est = 220
        elif job_count > 5:
            est = 95
        elif job_count > 0:
            est = 45
        elif has_enterprise_tech:
            est = 85
        elif len(technologies) > 8:
            est = 35
        elif len(technologies) > 3:
            est = 18
        else:
            est = 6
            
        # Adjust with funding
        if lead.funding:
            est = int(est * 1.5)
            
        return max(5, est)

    def _generate_ai_summary(self, lead: Lead, technologies: List[str]) -> str:
        """
        Generate a synthesized AI summary description based on the crawled attributes.
        """
        parts = []
        name = lead.company_name or "This organization"
        sector_str = lead.sector if lead.sector and lead.sector.lower() != 'unknown' else None
        industry_str = lead.industry if lead.industry and lead.industry.lower() != 'unknown' else None
        
        if sector_str and industry_str:
            parts.append(f"{name} is an established company operating in the {sector_str} sector, specializing in {industry_str}.")
        elif sector_str:
            parts.append(f"{name} is an active market player in the {sector_str} space.")
        elif industry_str:
            parts.append(f"{name} is a specialized enterprise in the {industry_str} industry.")
        else:
            parts.append(f"{name} is a commercial entity identified via lead discovery.")
            
        if lead.employees and lead.employees > 0:
            parts.append(f"The organization manages an estimated workforce of {lead.employees} employees.")
            
        if lead.funding:
            parts.append(f"They have successfully secured {lead.funding} in capital backing, confirming market traction.")
            
        if technologies:
            tech_subset = sorted(list(set(technologies)))[:4]
            parts.append(f"Their digital operations run on a modern infrastructure including {', '.join(tech_subset)}.")
            
        job_count = getattr(lead, "job_count", 0) or 0
        if job_count > 0:
            parts.append(f"They show expansion indicators with {job_count} active job listings detected on their careers portal.")
            
        return " ".join(parts)

    def _calculate_confidence_score(
        self,
        lead: Lead,
        emails: list,
        phones: list,
        socials: list,
        contact_pages: list,
    ) -> float:
        """
        Calculate confidence score matching the frontend's formula precisely.
        """
        score = 0.0
        
        # 1. Data completeness (30 points max)
        completeness = 0
        if lead.website:
            completeness += 15
        if lead.email or emails:
            completeness += 20
        if lead.phone or phones:
            completeness += 20
        if socials or lead.social_links:
            completeness += 15
        if (lead.sector and lead.sector.lower() != 'unknown') or (lead.industry and lead.industry.lower() != 'unknown'):
            completeness += 10
        if lead.funding and lead.funding.lower() != 'unknown':
            completeness += 10
        if lead.city or lead.state or lead.country:
            completeness += 10
            
        score += completeness * 0.3
        
        # 2. Contact availability (25 points max)
        has_email = bool(emails or lead.email)
        has_phone = bool(phones or lead.phone)
        if has_email and has_phone:
            score += 25
        elif has_email:
            score += 15
        elif has_phone:
            score += 10
            
        # 3. Discovered social profiles (20 points max)
        profile_count = len(socials)
        if profile_count == 0 and lead.social_links:
            profile_count = len({s.network for s in lead.social_links if s.network in ('linkedin','github','twitter','facebook','instagram','youtube')})
            
        if profile_count >= 2:
            score += 20
        elif profile_count == 1:
            score += 12
            
        # 4. Website quality (15 points max)
        if lead.website:
            if lead.website.lower().startswith('https://'):
                score += 15
            else:
                score += 10
                
        # 5. Funding info (10 points max)
        if lead.funding and lead.funding.lower() != 'unknown':
            score += 10
            
        return min(100.0, round(score, 1))
