from typing import Dict, Any
from sqlmodel import select
from sqlalchemy import func
from app.runners.base import BaseRunner
from app.models.lead import Lead, QualificationReason

class ScoringRunner(BaseRunner):
    """
    Lead qualification and AI Scoring Runner.
    Calculates lead intelligence metrics (0-100) based on actual crawled data:
    - Extracted contact info (emails, phones) from typed tables
    - Social profiles discovered from lead_social_profiles table
    - Page types discovered (careers, contact, about, support, product)
    - Company characteristics (size, funding, sector)
    - Intent signals from crawl
    Writes individual qualification criteria passes to the database.
    """
    async def run(self, workspace_id: str, lead_id: str = None, log_callback=None) -> Dict[str, Any]:
        self.start_timing()
        self.log_event(20, f"Starting AI Scoring & Qualifications Engine: {workspace_id}")

        if lead_id:
            statement = select(Lead).where(Lead.id == lead_id)
        else:
            statement = select(Lead).where(
                Lead.workspace_id == workspace_id,
                Lead.status.in_(["DISCOVERED", "CRAWLED", "ENRICHED", "QUALIFIED", "NURTURE"])
            )

        result = await self.session.exec(statement)
        leads = result.all()

        scored_count = 0
        reasons_created = 0
        scoring_logs = []

        from app.models.lead import (
            IntentSignal, LeadEmail, LeadPhone, LeadSocialProfile,
            LeadContactPage, LeadAboutPage, LeadSupportPage, LeadCareersPage, LeadProductPage
        )
        import json
        for lead in leads:
            self.log_event(20, f"Evaluating scoring coefficients for target: {lead.company_name}")
            scoring_logs.append(f"Scoring engine processing: qualified pipeline filters for {lead.company_name}...")

            # Query actual intent signals from database
            sig_stmt = select(IntentSignal).where(IntentSignal.lead_id == lead.id)
            sig_res = await self.session.execute(sig_stmt)
            signals = sig_res.scalars().all()

            # Query actual crawled data from typed tables
            emails_count = (await self.session.execute(
                select(func.count()).select_from(LeadEmail).where(LeadEmail.lead_id == lead.id)
            )).scalar() or 0

            phones_count = (await self.session.execute(
                select(func.count()).select_from(LeadPhone).where(LeadPhone.lead_id == lead.id)
            )).scalar() or 0

            social_count = (await self.session.execute(
                select(func.count()).select_from(LeadSocialProfile).where(LeadSocialProfile.lead_id == lead.id)
            )).scalar() or 0

            contact_count = (await self.session.execute(
                select(func.count()).select_from(LeadContactPage).where(LeadContactPage.lead_id == lead.id)
            )).scalar() or 0

            careers_count = (await self.session.execute(
                select(func.count()).select_from(LeadCareersPage).where(LeadCareersPage.lead_id == lead.id)
            )).scalar() or 0

            # Check if any product page is a pricing page
            product_pages = (await self.session.execute(
                select(LeadProductPage).where(LeadProductPage.lead_id == lead.id)
            )).scalars().all()
            pricing_page_found = any(
                "pricing" in p.url.lower() or "plans" in p.url.lower() or "price" in p.url.lower()
                for p in product_pages
            )

            # Parse technologies JSON
            technologies: list = []
            try:
                if lead.technologies:
                    technologies = json.loads(lead.technologies)
            except Exception:
                pass

            # Calculate score based on actual extracted data and intent signals
            score = self._calculate_score(
                lead, signals, emails_count, phones_count, social_count,
                contact_count, careers_count, technologies, pricing_page_found
            )
            conv_prob = self._calculate_conversion_probability(lead, score)
            confidence = self._calculate_confidence_score(lead, emails_count, phones_count, social_count, contact_count)

            score_before = lead.ai_score
            lead.ai_score = score
            lead.conversion_prob = conv_prob
            lead.confidence_score = confidence
            # Only promote leads — never forcibly demote a CRAWLED/ENRICHED lead to NURTURE.
            # A freshly crawled lead that scores < 75 should stay in the Discovery queue
            # (CRAWLED status) so the user can see it and review it.
            # Only leads already in DISCOVERED/NURTURE/QUALIFIED can be reclassified freely.
            if score >= 75:
                lead.status = "QUALIFIED"
            elif lead.status not in ("CRAWLED", "ENRICHED"):
                lead.status = "NURTURE"
            # else: leave CRAWLED/ENRICHED leads alone if score < 75
            self.session.add(lead)
            scored_count += 1

            msg = f"  {lead.company_name}: AI score updated {score_before} -> {score} | emails={emails_count} phones={phones_count} socials={social_count} contacts={contact_count} careers={careers_count}"
            scoring_logs.append(msg)
            if log_callback:
                log_callback(f"AI score updated {score_before} -> {score}")
                if score >= 75 and score_before < 75:
                    log_callback(f"Lead qualified: {lead.company_name}")

            # Generate qualification reasons based on lead characteristics
            reasons = self._generate_qualification_reasons(lead, emails_count, phones_count, social_count, careers_count)
            for reason_text in reasons:
                reason = QualificationReason(
                    lead_id=lead.id,
                    description=reason_text,
                    passed=True
                )
                self.session.add(reason)
                reasons_created += 1

        await self.session.commit()
        latency = self.end_timing()

        self.log_event(20, f"AI Scoring complete. Qualified {scored_count} leads in {latency:.3f}s.")
        scoring_logs.append(f"✓ Scoring complete: {scored_count} leads evaluated, {reasons_created} qualification reasons generated")
        return {
            "status": "COMPLETED",
            "scored_count": scored_count,
            "reasons_created": reasons_created,
            "latency_sec": latency,
            "logs": scoring_logs
        }

    @staticmethod
    def _calculate_score(
        lead: Lead,
        signals: list,
        emails_count: int = 0,
        phones_count: int = 0,
        social_count: int = 0,
        contact_count: int = 0,
        careers_count: int = 0,
        technologies: list = None,
        pricing_page_found: bool = False,
    ) -> int:
        """
        Calculate lead score (0-100) based on all crawled data.

        Scoring factors:
        - Contact info (typed tables): +20 (emails: +10, phones: +10)
        - Legacy top-level email/phone: +10 (email: +5, phone: +5)
        - Social profiles discovered: +5 per profile, max +20
        - Contact pages found: +5 (up to +10)
        - Careers page found: +10 (indicates hiring, growth company)
        - Company size: +30 max
        - Funding: +15
        - Website: +10
        - Technologies detected: +5 (3+ techs), +10 (5+ techs)
        - Job count on careers: +5 per 5 jobs, max +15
        - Pricing page found: +10 (high buying intent)
        - Description available: +5
        - Intent Signals: +5 to +15 per signal, max +30
        """
        score = 30  # Base score

        # Contact info from typed tables (real crawled data)
        if emails_count > 0:
            score += 10
        if phones_count > 0:
            score += 10

        # Legacy top-level fields (backward compat, lower weight)
        if lead.email and emails_count == 0:
            score += 5
        if lead.phone and phones_count == 0:
            score += 5

        # Social profiles discovered during crawl: up to +20
        score += min(20, social_count * 5)

        # Contact pages found
        score += min(10, contact_count * 5)

        # Careers page = hiring = growth signal
        if careers_count > 0:
            score += 10

        # Job count on careers pages: up to +15
        job_count = getattr(lead, 'job_count', 0) or 0
        if job_count > 0:
            score += min(15, (job_count // 5) * 5)

        # Pricing page = active commercial intent: +10
        if pricing_page_found:
            score += 10

        # Description quality: +5
        if lead.description and len(lead.description) > 30:
            score += 5

        # Technology stack: +5 for 3+ techs, +10 for 5+ techs
        techs = technologies or []
        if len(techs) >= 5:
            score += 10
        elif len(techs) >= 3:
            score += 5

        # Enterprise tech bonus: Stripe, Salesforce, HubSpot, AWS, Cloudflare detected
        enterprise_techs = {'Stripe', 'Salesforce', 'HubSpot', 'AWS', 'Cloudflare', 'Auth0', 'Segment'}
        if any(t in enterprise_techs for t in techs):
            score += 5

        # Company size: +30 max
        if lead.employees:
            if lead.employees > 500:
                score += 30
            elif lead.employees > 100:
                score += 20
            elif lead.employees > 10:
                score += 10

        # Funding: +15
        if lead.funding:
            score += 15

        # Website: +10
        if lead.website:
            score += 10

        # Intent signals: max +30
        signal_points = 0
        for sig in signals:
            if sig.intensity == "High":
                signal_points += 15
            elif sig.intensity == "Medium":
                signal_points += 10
            else:
                signal_points += 5
        score += min(30, signal_points)

        # Cap at 100
        return min(score, 100)

    @staticmethod
    def _calculate_conversion_probability(lead: Lead, score: int) -> float:
        """
        Calculate conversion probability based on score and available signals.
        Range: 0.0 to 100.0
        """
        base_prob = score * 0.9

        # Boost if contact info exists
        if lead.email and lead.phone:
            base_prob += 5.0

        return round(min(base_prob, 100.0), 1)

    @staticmethod
    def _generate_qualification_reasons(lead: Lead, emails_count: int = 0, phones_count: int = 0,
                                         social_count: int = 0, careers_count: int = 0) -> list:
        """
        Generate qualification reasons based on actual lead characteristics and crawled data.
        """
        reasons = []

        # Contact data reasons
        if emails_count > 0:
            reasons.append(f"{emails_count} business email(s) extracted from website crawl")
        elif lead.email:
            reasons.append("Direct email contact available")

        if phones_count > 0:
            reasons.append(f"{phones_count} phone number(s) discovered from company contact pages")
        elif lead.phone:
            reasons.append("Phone number available from company information")

        if social_count > 0:
            reasons.append(f"{social_count} verified social profile(s) discovered: LinkedIn, GitHub, Twitter, etc.")

        if careers_count > 0:
            reasons.append("Hiring activity detected: careers/jobs page found — growth signal")

        # Company profile reasons
        if lead.employees and lead.employees > 100:
            reasons.append(f"Enterprise-scale organization with {lead.employees}+ employees")

        if lead.employees and lead.employees > 500:
            reasons.append("Large enterprise: strong procurement capacity and decision-making authority")

        if lead.funding:
            reasons.append(f"Funded company ({lead.funding}): indicates market validation and growth")

        # Sector alignment
        if lead.sector and lead.sector.lower() in ['technology', 'saas', 'software', 'ai', 'ml']:
            reasons.append("High-value technology sector fit")

        # Website accessibility
        if lead.website:
            reasons.append("Active web presence with accessible corporate website")

        # Ensure at least one reason
        if not reasons:
            reasons.append(f"Company profile available: {lead.company_name} in {lead.sector} sector")

        # Return top 4 reasons
        return reasons[:4]

    @staticmethod
    def _calculate_confidence_score(
        lead: Lead,
        emails_count: int,
        phones_count: int,
        social_count: int,
        contact_count: int,
    ) -> float:
        """
        Calculate confidence score matching the frontend's formula precisely.
        """
        score = 0.0
        
        # 1. Data completeness (30 points max)
        completeness = 0
        if lead.website:
            completeness += 15
        if lead.email or emails_count > 0:
            completeness += 20
        if lead.phone or phones_count > 0:
            completeness += 20
        if social_count > 0 or lead.social_links:
            completeness += 15
        if (lead.sector and lead.sector.lower() != 'unknown') or (lead.industry and lead.industry.lower() != 'unknown'):
            completeness += 10
        if lead.funding and lead.funding.lower() != 'unknown':
            completeness += 10
        if lead.city or lead.state or lead.country:
            completeness += 10
            
        score += completeness * 0.3
        
        # 2. Contact availability (25 points max)
        has_email = bool(emails_count > 0 or lead.email)
        has_phone = bool(phones_count > 0 or lead.phone)
        if has_email and has_phone:
            score += 25
        elif has_email:
            score += 15
        elif has_phone:
            score += 10
            
        # 3. Discovered social profiles (20 points max)
        profile_count = social_count
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
