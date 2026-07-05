from fastapi import APIRouter, Depends, Query, HTTPException, status, BackgroundTasks
from typing import Optional, List
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import select, or_
from app.core.database import get_session
from app.core.deps import CurrentUser
from app.models.lead import Lead, AIInsight, IntentSignal, QualificationReason, CrawlJob
from app.schemas.lead import (
    LeadCreate, LeadUpdate, LeadOut, AIInsightOut, IntentSignalOut, QualificationReasonOut, LeadContactsOut,
    CrawlJobCreate, CrawlJobOut
)
from fastapi.responses import Response
import csv
import io
from datetime import datetime, timezone
import uuid
import json

router = APIRouter(prefix="/leads", tags=["Leads"])


# ── Country name normalization utility ────────────────────────────────────────
# Maps ISO codes, abbreviations, and alternate spellings to canonical full names.
_COUNTRY_NAME_MAP = {
    "in": "India", "india": "India", "ind": "India",
    "us": "United States", "usa": "United States", "u.s.": "United States",
    "united states of america": "United States", "united states": "United States",
    "gb": "United Kingdom", "uk": "United Kingdom", "united kingdom": "United Kingdom",
    "england": "United Kingdom", "britain": "United Kingdom",
    "ca": "Canada", "canada": "Canada",
    "au": "Australia", "australia": "Australia",
    "de": "Germany", "germany": "Germany", "deutschland": "Germany",
    "fr": "France", "france": "France",
    "sg": "Singapore", "singapore": "Singapore",
    "jp": "Japan", "japan": "Japan",
    "cn": "China", "china": "China",
    "nl": "Netherlands", "netherlands": "Netherlands",
    "se": "Sweden", "sweden": "Sweden",
    "ie": "Ireland", "ireland": "Ireland",
    "ae": "United Arab Emirates", "uae": "United Arab Emirates", "united arab emirates": "United Arab Emirates",
    "br": "Brazil", "brazil": "Brazil",
    "mx": "Mexico", "mexico": "Mexico",
    "nz": "New Zealand", "new zealand": "New Zealand",
}

def normalize_country_name(value: Optional[str]) -> Optional[str]:
    """Normalize country value to full canonical name. Returns None if value is empty/Unknown."""
    if not value or value.strip().lower() in ("", "unknown", "n/a", "na", "none"):
        return None
    mapped = _COUNTRY_NAME_MAP.get(value.strip().lower())
    return mapped if mapped else value.strip().title()


# ── City normalization utility ─────────────────────────────────────────────────
def normalize_city_name(value: Optional[str]) -> Optional[str]:
    if not value or value.strip().lower() in ("", "unknown", "n/a", "na", "none"):
        return None
    city_map = {
        "bangalore": "Bengaluru", "bengaluru": "Bengaluru",
        "bombay": "Mumbai", "mumbai": "Mumbai",
        "madras": "Chennai", "chennai": "Chennai",
        "calcutta": "Kolkata", "kolkata": "Kolkata",
        "new delhi": "New Delhi", "delhi": "New Delhi",
    }
    return city_map.get(value.strip().lower(), value.strip().title())


# ── US State Synonym Resolvers ───────────────────────────────────────────────
US_STATE_CODES = {
    "al": "Alabama", "ak": "Alaska", "az": "Arizona", "ar": "Arkansas", "ca": "California",
    "co": "Colorado", "ct": "Connecticut", "de": "Delaware", "fl": "Florida", "ga": "Georgia",
    "hi": "Hawaii", "id": "Idaho", "il": "Illinois", "in": "Indiana", "ia": "Iowa",
    "ks": "Kansas", "ky": "Kentucky", "la": "Louisiana", "me": "Maine", "md": "Maryland",
    "ma": "Massachusetts", "mi": "Michigan", "mn": "Minnesota", "ms": "Mississippi",
    "mo": "Missouri", "mt": "Montana", "ne": "Nebraska", "nv": "Nevada", "nh": "New Hampshire",
    "nj": "New Jersey", "nm": "New Mexico", "ny": "New York", "nc": "North Carolina",
    "nd": "North Dakota", "oh": "Ohio", "ok": "Oklahoma", "or": "Oregon", "pa": "Pennsylvania",
    "ri": "Rhode Island", "sc": "South Carolina", "sd": "South Dakota", "tn": "Tennessee",
    "tx": "Texas", "ut": "Utah", "vt": "Vermont", "va": "Virginia", "wa": "Washington",
    "wv": "West Virginia", "wi": "Wisconsin", "wy": "Wyoming"
}
US_STATE_NAMES = {v.lower(): k.upper() for k, v in US_STATE_CODES.items()}

def resolve_state_synonyms(state_name: Optional[str]) -> list[str]:
    if not state_name:
        return []
    state_lower = state_name.strip().lower()
    syns = [state_name.strip()]
    if state_lower in US_STATE_CODES:
        full_name = US_STATE_CODES[state_lower]
        if full_name not in syns:
            syns.append(full_name)
    elif state_lower in US_STATE_NAMES:
        code = US_STATE_NAMES[state_lower]
        if code not in syns:
            syns.append(code)
    return syns


def _map_lead(
    lead: Lead, insights=None, signals=None, reasons=None, emails=None, phones=None,
    social_profiles=None, contact_pages=None, about_pages=None, support_pages=None,
    careers_pages=None, product_pages=None
) -> LeadOut:
    from app.schemas.lead import (
        LeadEmailOut, LeadPhoneOut, LeadSocialLinkOut, LeadSocialProfileOut,
        LeadContactPageOut, LeadAboutPageOut, LeadSupportPageOut, LeadCareersPageOut, LeadProductPageOut,
        AIInsightOut, IntentSignalOut, QualificationReasonOut
    )
    
    # Map each specific list
    mapped_profiles = [
        LeadSocialProfileOut(
            id=s.id, leadId=s.lead_id, socialUrl=s.social_url, network=s.network, sourceUrl=s.source_url,
            discoveryPage=s.discovery_page, crawlTimestamp=s.crawl_timestamp, confidenceScore=s.confidence_score,
            validationStatus=s.validation_status
        )
        for s in (social_profiles or [])
    ]
    mapped_contacts = [
        LeadContactPageOut(
            id=c.id, leadId=c.lead_id, url=c.url, sourceUrl=c.source_url,
            discoveryPage=c.discovery_page, crawlTimestamp=c.crawl_timestamp, confidenceScore=c.confidence_score
        )
        for c in (contact_pages or [])
    ]
    mapped_abouts = [
        LeadAboutPageOut(
            id=a.id, leadId=a.lead_id, url=a.url, sourceUrl=a.source_url,
            discoveryPage=a.discovery_page, crawlTimestamp=a.crawl_timestamp, confidenceScore=a.confidence_score
        )
        for a in (about_pages or [])
    ]
    mapped_supports = [
        LeadSupportPageOut(
            id=s.id, leadId=s.lead_id, url=s.url, sourceUrl=s.source_url,
            discoveryPage=s.discovery_page, crawlTimestamp=s.crawl_timestamp, confidenceScore=s.confidence_score
        )
        for s in (support_pages or [])
    ]
    mapped_careers = [
        LeadCareersPageOut(
            id=c.id, leadId=c.lead_id, url=c.url, sourceUrl=c.source_url,
            discoveryPage=c.discovery_page, crawlTimestamp=c.crawl_timestamp, confidenceScore=c.confidence_score
        )
        for c in (careers_pages or [])
    ]
    mapped_products = [
        LeadProductPageOut(
            id=p.id, leadId=p.lead_id, url=p.url, sourceUrl=p.source_url,
            discoveryPage=p.discovery_page, crawlTimestamp=p.crawl_timestamp, confidenceScore=p.confidence_score
        )
        for p in (product_pages or [])
    ]

    # For backward compatibility, build socialLinks list from all profiles and pages
    merged_social_links = []
    for s in mapped_profiles:
        merged_social_links.append(
            LeadSocialLinkOut(
                id=s.id, leadId=s.leadId, socialUrl=s.socialUrl, network=s.network, sourceUrl=s.sourceUrl,
                discoveryPage=s.discoveryPage, crawlTimestamp=s.crawlTimestamp, confidenceScore=s.confidenceScore,
                validationStatus=s.validationStatus
            )
        )
    for c in mapped_contacts:
        merged_social_links.append(
            LeadSocialLinkOut(
                id=c.id, leadId=c.leadId, socialUrl=c.url, network="contact_page", sourceUrl=c.sourceUrl,
                discoveryPage=c.discoveryPage, crawlTimestamp=c.crawlTimestamp, confidenceScore=c.confidenceScore,
                validationStatus="VALID"
            )
        )
    for a in mapped_abouts:
        merged_social_links.append(
            LeadSocialLinkOut(
                id=a.id, leadId=a.leadId, socialUrl=a.url, network="about_page", sourceUrl=a.sourceUrl,
                discoveryPage=a.discoveryPage, crawlTimestamp=a.crawlTimestamp, confidenceScore=a.confidenceScore,
                validationStatus="VALID"
            )
        )
    for s in mapped_supports:
        merged_social_links.append(
            LeadSocialLinkOut(
                id=s.id, leadId=s.leadId, socialUrl=s.url, network="support", sourceUrl=s.sourceUrl,
                discoveryPage=s.discoveryPage, crawlTimestamp=s.crawlTimestamp, confidenceScore=s.confidenceScore,
                validationStatus="VALID"
            )
        )
    for c in mapped_careers:
        merged_social_links.append(
            LeadSocialLinkOut(
                id=c.id, leadId=c.leadId, socialUrl=c.url, network="careers", sourceUrl=c.sourceUrl,
                discoveryPage=c.discoveryPage, crawlTimestamp=c.crawlTimestamp, confidenceScore=c.confidenceScore,
                validationStatus="VALID"
            )
        )
    for p in mapped_products:
        merged_social_links.append(
            LeadSocialLinkOut(
                id=p.id, leadId=p.leadId, socialUrl=p.url, network="product", sourceUrl=p.sourceUrl,
                discoveryPage=p.discoveryPage, crawlTimestamp=p.crawlTimestamp, confidenceScore=p.confidenceScore,
                validationStatus="VALID"
            )
        )

    return LeadOut(
        id=lead.id,
        workspaceId=lead.workspace_id,
        companyName=lead.company_name or "Unknown",
        sector=lead.sector or "Unknown",
        industry=lead.industry or "Unknown",
        employees=lead.employees or 0,
        funding=lead.funding or "Unknown",
        website=lead.website or "Unknown",
        email=lead.email or "Unknown",
        phone=lead.phone or "Unknown",
        country=lead.country or "Unknown",
        city=lead.city or "Unknown",
        state=lead.state or "Unknown",
        postalCode=getattr(lead, 'postal_code', None) or "Unknown",
        fullAddress=getattr(lead, 'full_address', None) or "Unknown",
        latitude=getattr(lead, 'latitude', None) or 0.0,
        longitude=getattr(lead, 'longitude', None) or 0.0,
        revenueRange=lead.revenue_range or "Unknown",
        discoverySource=lead.discovery_source or "Unknown",
        hiringStatus=lead.hiring_status or "Unknown",
        conversionProb=lead.conversion_prob or 0.0,
        aiScore=lead.ai_score or 0,
        confidenceScore=getattr(lead, 'confidence_score', 0.0) or 0.0,
        status=lead.status or "Unknown",
        createdAt=lead.created_at,
        updatedAt=lead.updated_at,
        description=getattr(lead, 'description', None) or "Unknown",
        seoTitle=getattr(lead, 'seo_title', None) or "Unknown",
        seoDescription=getattr(lead, 'seo_description', None) or "Unknown",
        technologies=getattr(lead, 'technologies', None) or "[]",
        jobCount=getattr(lead, 'job_count', 0) or 0,
        pagesCrawled=getattr(lead, 'pages_crawled', 0) or 0,
        jobListings=getattr(lead, 'job_listings', None) or "[]",
        insights=[
            AIInsightOut(id=i.id, summary=i.summary, sourceType=i.source_type, createdAt=i.created_at)
            for i in (insights or [])
        ],
        intentSignals=[
            IntentSignalOut(id=s.id, signalType=s.signal_type, volume=s.volume, intensity=s.intensity, detectedAt=s.detected_at)
            for s in (signals or [])
        ],
        reasoningPoints=[
            QualificationReasonOut(id=r.id, description=r.description, passed=r.passed, checkedAt=r.checked_at)
            for r in (reasons or [])
        ],
        emails=[
            LeadEmailOut(
                id=e.id, leadId=e.lead_id, email=e.email, sourceUrl=e.source_url,
                discoveryPage=e.discovery_page, crawlTimestamp=e.crawl_timestamp, confidenceScore=e.confidence_score
            )
            for e in (emails or [])
        ],
        phones=[
            LeadPhoneOut(
                id=p.id, leadId=p.lead_id, phone=p.phone, sourceUrl=p.source_url,
                discoveryPage=p.discovery_page, crawlTimestamp=p.crawl_timestamp, confidenceScore=p.confidence_score
            )
            for p in (phones or [])
        ],
        socialLinks=merged_social_links,
        socialProfiles=mapped_profiles,
        contactPages=mapped_contacts,
        aboutPages=mapped_abouts,
        supportPages=mapped_supports,
        careersPages=mapped_careers,
        productPages=mapped_products
    )


@router.get("", response_model=list[LeadOut])
async def list_leads(
    workspaceId: str = Query(...),
    status: str = Query(default=None),
    search: str = Query(default=None),
    country: str = Query(default=None),
    state: str = Query(default=None),
    city: str = Query(default=None),
    industry: str = Query(default=None),
    hiringDepartment: str = Query(default=None),
    fundingStage: str = Query(default=None),
    revenueRange: str = Query(default=None),
    minEmployees: int = Query(default=None),
    maxEmployees: int = Query(default=None),
    hiringStatus: str = Query(default=None),
    subIndustry: str = Query(default=None),
    technology: str = Query(default=None),
    minScore: int = Query(default=None),
    maxScore: int = Query(default=None),
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    query = select(Lead).where(Lead.workspace_id == workspaceId)  # type: ignore

    if status:
        if status == "DISCOVERED":
            query = query.where(Lead.status.in_(["DISCOVERED", "CRAWLED", "ENRICHED", "QUALIFIED"]))  # type: ignore
        else:
            query = query.where(Lead.status == status)  # type: ignore
    else:
        query = query.where(Lead.status.in_(["QUALIFIED", "NURTURE"]))  # type: ignore

    if search:
        query = query.where(
            or_(
                Lead.company_name.ilike(f"%{search}%"),  # type: ignore
                Lead.sector.ilike(f"%{search}%"),  # type: ignore
                Lead.industry.ilike(f"%{search}%"),  # type: ignore
                Lead.website.ilike(f"%{search}%"),  # type: ignore
            )
        )

    # Server-side filters — applied with AND logic
    if country:
        norm_country = normalize_country_name(country)
        if norm_country:
            query = query.where(Lead.country.ilike(norm_country))  # type: ignore

    if state:
        state_syns = resolve_state_synonyms(state)
        query = query.where(or_(*[Lead.state.ilike(s) for s in state_syns]))  # type: ignore

    if city:
        # Support canonical form lookup
        norm_city = normalize_city_name(city) or city
        query = query.where(  # type: ignore
            or_(
                Lead.city.ilike(norm_city),
                Lead.city.ilike(city),
            )
        )

    if industry:
        query = query.where(  # type: ignore
            or_(
                Lead.sector.ilike(f"%{industry}%"),
                Lead.industry.ilike(f"%{industry}%"),
            )
        )

    if hiringStatus:
        query = query.where(Lead.hiring_status == hiringStatus)  # type: ignore

    if revenueRange:
        query = query.where(Lead.revenue_range == revenueRange)  # type: ignore

    if fundingStage:
        if fundingStage == 'Early':
            query = query.where(Lead.funding.ilike('%seed%'))  # type: ignore
        elif fundingStage == 'Growth':
            query = query.where(Lead.funding.ilike('%series a%'))  # type: ignore
        elif fundingStage == 'Late':
            query = query.where(  # type: ignore
                or_(
                    Lead.funding.ilike('%series b%'),
                    Lead.funding.ilike('%series c%'),
                    Lead.funding.ilike('%series d%'),
                    Lead.funding.ilike('%ipo%'),
                    Lead.funding.ilike('%public%'),
                )
            )

    if minEmployees is not None:
        query = query.where(Lead.employees >= minEmployees)  # type: ignore

    if maxEmployees is not None:
        query = query.where(Lead.employees <= maxEmployees)  # type: ignore

    if hiringDepartment:
        # Filter by hiring_departments JSON field (contains the department string)
        query = query.where(Lead.hiring_departments.ilike(f"%{hiringDepartment}%"))  # type: ignore

    if subIndustry:
        query = query.where(Lead.industry.ilike(f"%{subIndustry}%"))  # type: ignore

    if technology:
        query = query.where(Lead.technologies.ilike(f"%{technology}%"))  # type: ignore

    if minScore is not None:
        query = query.where(Lead.ai_score >= minScore)  # type: ignore

    if maxScore is not None:
        query = query.where(Lead.ai_score <= maxScore)  # type: ignore

    query = query.order_by(Lead.ai_score.desc())  # type: ignore
    result = await session.execute(query)
    leads = result.scalars().all()

    out = []
    from app.models.lead import (
        LeadEmail, LeadPhone, LeadSocialProfile, LeadContactPage, LeadAboutPage,
        LeadSupportPage, LeadCareersPage, LeadProductPage
    )
    for lead in leads:
        ins = await session.execute(select(AIInsight).where(AIInsight.lead_id == lead.id))  # type: ignore
        sigs = await session.execute(select(IntentSignal).where(IntentSignal.lead_id == lead.id))  # type: ignore
        emails_res = await session.execute(select(LeadEmail).where(LeadEmail.lead_id == lead.id))
        phones_res = await session.execute(select(LeadPhone).where(LeadPhone.lead_id == lead.id))
        profiles_res = await session.execute(select(LeadSocialProfile).where(LeadSocialProfile.lead_id == lead.id))
        contacts_res = await session.execute(select(LeadContactPage).where(LeadContactPage.lead_id == lead.id))
        abouts_res = await session.execute(select(LeadAboutPage).where(LeadAboutPage.lead_id == lead.id))
        supports_res = await session.execute(select(LeadSupportPage).where(LeadSupportPage.lead_id == lead.id))
        careers_res = await session.execute(select(LeadCareersPage).where(LeadCareersPage.lead_id == lead.id))
        products_res = await session.execute(select(LeadProductPage).where(LeadProductPage.lead_id == lead.id))
        
        out.append(_map_lead(
            lead,
            insights=ins.scalars().all(),
            signals=sigs.scalars().all(),
            reasons=None,
            emails=emails_res.scalars().all(),
            phones=phones_res.scalars().all(),
            social_profiles=profiles_res.scalars().all(),
            contact_pages=contacts_res.scalars().all(),
            about_pages=abouts_res.scalars().all(),
            support_pages=supports_res.scalars().all(),
            careers_pages=careers_res.scalars().all(),
            product_pages=products_res.scalars().all()
        ))
    return out


@router.get("/export/csv")
async def export_csv(
    workspaceId: str = Query(...),
    leadIds: Optional[str] = Query(default=None),
    session: AsyncSession = Depends(get_session),
):
    from app.models.lead import (
        Lead, LeadEmail, LeadPhone, LeadSocialProfile, LeadContactPage, LeadAboutPage,
        LeadSupportPage, LeadCareersPage, LeadProductPage
    )
    query = select(Lead).where(Lead.workspace_id == workspaceId)
    if leadIds:
        ids_list = leadIds.split(",")
        query = query.where(Lead.id.in_(ids_list))
    query = query.order_by(Lead.ai_score.desc())
    result = await session.execute(query)
    leads = result.scalars().all()

    output = io.StringIO()
    output.write('\ufeff')
    writer = csv.writer(output)
    
    writer.writerow([
        "Company Name", "Website", "Sector", "Industry", "Employees", "Funding", 
        "AI Score", "Conversion Probability", "Hiring Status", "Discovered Emails", 
        "Discovered Phones", "Discovered Social Links"
    ])
    
    for lead in leads:
        em_res = await session.execute(select(LeadEmail).where(LeadEmail.lead_id == lead.id))
        emails = "; ".join([e.email for e in em_res.scalars().all()])

        ph_res = await session.execute(select(LeadPhone).where(LeadPhone.lead_id == lead.id))
        phones = "; ".join([p.phone for p in ph_res.scalars().all()])

        profiles = (await session.execute(select(LeadSocialProfile).where(LeadSocialProfile.lead_id == lead.id))).scalars().all()
        contacts = (await session.execute(select(LeadContactPage).where(LeadContactPage.lead_id == lead.id))).scalars().all()
        abouts = (await session.execute(select(LeadAboutPage).where(LeadAboutPage.lead_id == lead.id))).scalars().all()
        supports = (await session.execute(select(LeadSupportPage).where(LeadSupportPage.lead_id == lead.id))).scalars().all()
        careers = (await session.execute(select(LeadCareersPage).where(LeadCareersPage.lead_id == lead.id))).scalars().all()
        products = (await session.execute(select(LeadProductPage).where(LeadProductPage.lead_id == lead.id))).scalars().all()
        
        all_urls = [p.social_url for p in profiles] + [c.url for c in contacts + abouts + supports + careers + products]
        socials = "; ".join(all_urls)

        writer.writerow([
            lead.company_name, lead.website or "N/A", lead.sector, lead.industry, lead.employees,
            lead.funding or "N/A", lead.ai_score, f"{lead.conversion_prob}%", lead.hiring_status,
            emails or "N/A", phones or "N/A", socials or "N/A"
        ])
        
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads_export.csv"}
    )


@router.get("/export/excel")
async def export_excel(
    workspaceId: str = Query(...),
    leadIds: Optional[str] = Query(default=None),
    session: AsyncSession = Depends(get_session),
):
    from app.models.lead import (
        Lead, LeadEmail, LeadPhone, LeadSocialProfile, LeadContactPage, LeadAboutPage,
        LeadSupportPage, LeadCareersPage, LeadProductPage
    )
    query = select(Lead).where(Lead.workspace_id == workspaceId)
    if leadIds:
        ids_list = leadIds.split(",")
        query = query.where(Lead.id.in_(ids_list))
    query = query.order_by(Lead.ai_score.desc())
    result = await session.execute(query)
    leads = result.scalars().all()

    output = io.StringIO()
    output.write('\ufeff')
    writer = csv.writer(output, delimiter='\t')
    
    writer.writerow([
        "Company Name", "Website", "Sector", "Industry", "Employees", "Funding", 
        "AI Score", "Conversion Probability", "Hiring Status", "Discovered Emails", 
        "Discovered Phones", "Discovered Social Links"
    ])
    
    for lead in leads:
        em_res = await session.execute(select(LeadEmail).where(LeadEmail.lead_id == lead.id))
        emails = "; ".join([e.email for e in em_res.scalars().all()])

        ph_res = await session.execute(select(LeadPhone).where(LeadPhone.lead_id == lead.id))
        phones = "; ".join([p.phone for p in ph_res.scalars().all()])

        profiles = (await session.execute(select(LeadSocialProfile).where(LeadSocialProfile.lead_id == lead.id))).scalars().all()
        contacts = (await session.execute(select(LeadContactPage).where(LeadContactPage.lead_id == lead.id))).scalars().all()
        abouts = (await session.execute(select(LeadAboutPage).where(LeadAboutPage.lead_id == lead.id))).scalars().all()
        supports = (await session.execute(select(LeadSupportPage).where(LeadSupportPage.lead_id == lead.id))).scalars().all()
        careers = (await session.execute(select(LeadCareersPage).where(LeadCareersPage.lead_id == lead.id))).scalars().all()
        products = (await session.execute(select(LeadProductPage).where(LeadProductPage.lead_id == lead.id))).scalars().all()
        
        all_urls = [p.social_url for p in profiles] + [c.url for c in contacts + abouts + supports + careers + products]
        socials = "; ".join(all_urls)

        writer.writerow([
            lead.company_name, lead.website or "N/A", lead.sector, lead.industry, lead.employees,
            lead.funding or "N/A", lead.ai_score, f"{lead.conversion_prob}%", lead.hiring_status,
            emails or "N/A", phones or "N/A", socials or "N/A"
        ])
        
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.ms-excel",
        headers={"Content-Disposition": "attachment; filename=leads_export.xls"}
    )


@router.get("/export/json")
async def export_json(
    workspaceId: str = Query(...),
    leadIds: Optional[str] = Query(default=None),
    session: AsyncSession = Depends(get_session),
):
    from app.models.lead import (
        Lead, LeadEmail, LeadPhone, LeadSocialProfile, LeadContactPage, LeadAboutPage,
        LeadSupportPage, LeadCareersPage, LeadProductPage
    )
    query = select(Lead).where(Lead.workspace_id == workspaceId)
    if leadIds:
        ids_list = leadIds.split(",")
        query = query.where(Lead.id.in_(ids_list))
    query = query.order_by(Lead.ai_score.desc())
    result = await session.execute(query)
    leads = result.scalars().all()

    leads_list = []
    for lead in leads:
        em_res = await session.execute(select(LeadEmail).where(LeadEmail.lead_id == lead.id))
        emails = [e.email for e in em_res.scalars().all()]

        ph_res = await session.execute(select(LeadPhone).where(LeadPhone.lead_id == lead.id))
        phones = [p.phone for p in ph_res.scalars().all()]

        profiles = (await session.execute(select(LeadSocialProfile).where(LeadSocialProfile.lead_id == lead.id))).scalars().all()
        contacts = (await session.execute(select(LeadContactPage).where(LeadContactPage.lead_id == lead.id))).scalars().all()
        abouts = (await session.execute(select(LeadAboutPage).where(LeadAboutPage.lead_id == lead.id))).scalars().all()
        supports = (await session.execute(select(LeadSupportPage).where(LeadSupportPage.lead_id == lead.id))).scalars().all()
        careers = (await session.execute(select(LeadCareersPage).where(LeadCareersPage.lead_id == lead.id))).scalars().all()
        products = (await session.execute(select(LeadProductPage).where(LeadProductPage.lead_id == lead.id))).scalars().all()

        socials = [
            {"url": s.social_url, "network": s.network, "confidence": s.confidence_score, "discovered_at": s.crawl_timestamp.isoformat(), "type": "social_profile"}
            for s in profiles
        ] + [
            {"url": c.url, "network": "contact_page", "confidence": c.confidence_score, "discovered_at": c.crawl_timestamp.isoformat(), "type": "contact_page"}
            for c in contacts
        ] + [
            {"url": a.url, "network": "about_page", "confidence": a.confidence_score, "discovered_at": a.crawl_timestamp.isoformat(), "type": "about_page"}
            for a in abouts
        ] + [
            {"url": s.url, "network": "support", "confidence": s.confidence_score, "discovered_at": s.crawl_timestamp.isoformat(), "type": "support"}
            for s in supports
        ] + [
            {"url": c.url, "network": "careers", "confidence": c.confidence_score, "discovered_at": c.crawl_timestamp.isoformat(), "type": "careers"}
            for c in careers
        ] + [
            {"url": p.url, "network": "product", "confidence": p.confidence_score, "discovered_at": p.crawl_timestamp.isoformat(), "type": "product"}
            for p in products
        ]

        leads_list.append({
            "companyName": lead.company_name,
            "website": lead.website,
            "sector": lead.sector,
            "industry": lead.industry,
            "employees": lead.employees,
            "funding": lead.funding,
            "aiScore": lead.ai_score,
            "conversionProbability": lead.conversion_prob,
            "hiringStatus": lead.hiring_status,
            "contacts": {
                "emails": emails,
                "phones": phones,
                "socialLinks": socials
            }
        })
        
    return Response(
        content=json.dumps(leads_list, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=leads_export.json"}
    )


@router.get("/{lead_id}/contacts", response_model=LeadContactsOut)
async def get_lead_contacts(
    lead_id: str,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    lead = await session.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    from app.models.lead import (
        LeadEmail, LeadPhone, LeadSocialProfile, LeadContactPage, LeadAboutPage,
        LeadSupportPage, LeadCareersPage, LeadProductPage
    )
    from app.schemas.lead import (
        LeadEmailOut, LeadPhoneOut, LeadSocialLinkOut, LeadSocialProfileOut,
        LeadContactPageOut, LeadAboutPageOut, LeadSupportPageOut, LeadCareersPageOut, LeadProductPageOut
    )
    
    emails = (await session.execute(select(LeadEmail).where(LeadEmail.lead_id == lead_id))).scalars().all()
    phones = (await session.execute(select(LeadPhone).where(LeadPhone.lead_id == lead_id))).scalars().all()
    profiles = (await session.execute(select(LeadSocialProfile).where(LeadSocialProfile.lead_id == lead_id))).scalars().all()
    contacts = (await session.execute(select(LeadContactPage).where(LeadContactPage.lead_id == lead_id))).scalars().all()
    abouts = (await session.execute(select(LeadAboutPage).where(LeadAboutPage.lead_id == lead_id))).scalars().all()
    supports = (await session.execute(select(LeadSupportPage).where(LeadSupportPage.lead_id == lead_id))).scalars().all()
    careers = (await session.execute(select(LeadCareersPage).where(LeadCareersPage.lead_id == lead_id))).scalars().all()
    products = (await session.execute(select(LeadProductPage).where(LeadProductPage.lead_id == lead_id))).scalars().all()

    mapped_profiles = [
        LeadSocialProfileOut(
            id=s.id, leadId=s.lead_id, socialUrl=s.social_url, network=s.network, sourceUrl=s.source_url,
            discoveryPage=s.discovery_page, crawlTimestamp=s.crawl_timestamp, confidenceScore=s.confidence_score,
            validationStatus=s.validation_status
        )
        for s in profiles
    ]
    mapped_contacts = [
        LeadContactPageOut(
            id=c.id, leadId=c.lead_id, url=c.url, sourceUrl=c.source_url,
            discoveryPage=c.discovery_page, crawlTimestamp=c.crawl_timestamp, confidenceScore=c.confidence_score
        )
        for c in contacts
    ]
    mapped_abouts = [
        LeadAboutPageOut(
            id=a.id, leadId=a.lead_id, url=a.url, sourceUrl=a.source_url,
            discoveryPage=a.discovery_page, crawlTimestamp=a.crawl_timestamp, confidenceScore=a.confidence_score
        )
        for a in abouts
    ]
    mapped_supports = [
        LeadSupportPageOut(
            id=s.id, leadId=s.lead_id, url=s.url, sourceUrl=s.source_url,
            discoveryPage=s.discovery_page, crawlTimestamp=s.crawl_timestamp, confidenceScore=s.confidence_score
        )
        for s in supports
    ]
    mapped_careers = [
        LeadCareersPageOut(
            id=c.id, leadId=c.lead_id, url=c.url, sourceUrl=c.source_url,
            discoveryPage=c.discovery_page, crawlTimestamp=c.crawl_timestamp, confidenceScore=c.confidence_score
        )
        for c in careers
    ]
    mapped_products = [
        LeadProductPageOut(
            id=p.id, leadId=p.lead_id, url=p.url, sourceUrl=p.source_url,
            discoveryPage=p.discovery_page, crawlTimestamp=p.crawl_timestamp, confidenceScore=p.confidence_score
        )
        for p in products
    ]

    # For backward compatibility, build socialLinks list from all profiles and pages
    merged_social_links = []
    for s in mapped_profiles:
        merged_social_links.append(
            LeadSocialLinkOut(
                id=s.id, leadId=s.leadId, socialUrl=s.socialUrl, network=s.network, sourceUrl=s.sourceUrl,
                discoveryPage=s.discoveryPage, crawlTimestamp=s.crawlTimestamp, confidenceScore=s.confidenceScore,
                validationStatus=s.validationStatus
            )
        )
    for c in mapped_contacts:
        merged_social_links.append(
            LeadSocialLinkOut(
                id=c.id, leadId=c.leadId, socialUrl=c.url, network="contact_page", sourceUrl=c.sourceUrl,
                discoveryPage=c.discoveryPage, crawlTimestamp=c.crawlTimestamp, confidenceScore=c.confidenceScore,
                validationStatus="VALID"
            )
        )
    for a in mapped_abouts:
        merged_social_links.append(
            LeadSocialLinkOut(
                id=a.id, leadId=a.leadId, socialUrl=a.url, network="about_page", sourceUrl=a.sourceUrl,
                discoveryPage=a.discoveryPage, crawlTimestamp=a.crawlTimestamp, confidenceScore=a.confidenceScore,
                validationStatus="VALID"
            )
        )
    for s in mapped_supports:
        merged_social_links.append(
            LeadSocialLinkOut(
                id=s.id, leadId=s.leadId, socialUrl=s.url, network="support", sourceUrl=s.sourceUrl,
                discoveryPage=s.discoveryPage, crawlTimestamp=s.crawlTimestamp, confidenceScore=s.confidenceScore,
                validationStatus="VALID"
            )
        )
    for c in mapped_careers:
        merged_social_links.append(
            LeadSocialLinkOut(
                id=c.id, leadId=c.leadId, socialUrl=c.url, network="careers", sourceUrl=c.sourceUrl,
                discoveryPage=c.discoveryPage, crawlTimestamp=c.crawlTimestamp, confidenceScore=c.confidenceScore,
                validationStatus="VALID"
            )
        )
    for p in mapped_products:
        merged_social_links.append(
            LeadSocialLinkOut(
                id=p.id, leadId=p.leadId, socialUrl=p.url, network="product", sourceUrl=p.sourceUrl,
                discoveryPage=p.discoveryPage, crawlTimestamp=p.crawlTimestamp, confidenceScore=p.confidenceScore,
                validationStatus="VALID"
            )
        )

    return LeadContactsOut(
        emails=[
            LeadEmailOut(
                id=e.id, leadId=e.lead_id, email=e.email, sourceUrl=e.source_url,
                discoveryPage=e.discovery_page, crawlTimestamp=e.crawl_timestamp, confidenceScore=e.confidence_score
            )
            for e in emails
        ],
        phones=[
            LeadPhoneOut(
                id=p.id, leadId=p.lead_id, phone=p.phone, sourceUrl=p.source_url,
                discoveryPage=p.discovery_page, crawlTimestamp=p.crawl_timestamp, confidenceScore=p.confidence_score
            )
            for p in phones
        ],
        socialLinks=merged_social_links,
        socialProfiles=mapped_profiles,
        contactPages=mapped_contacts,
        aboutPages=mapped_abouts,
        supportPages=mapped_supports,
        careersPages=mapped_careers,
        productPages=mapped_products
    )


class BulkActionRequest(BaseModel):
    leadIds: list[str]


@router.post("/bulk-qualify")
async def bulk_qualify(
    body: BulkActionRequest,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    from app.runners.scoring import ScoringRunner
    scorer = ScoringRunner(session)
    for lid in body.leadIds:
        lead = await session.get(Lead, lid)
        if lead:
            await scorer.run(workspace_id=lead.workspace_id, lead_id=lid)
    return {"message": f"Successfully qualified {len(body.leadIds)} leads"}


@router.post("/bulk-reject")
async def bulk_reject(
    body: BulkActionRequest,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    for lid in body.leadIds:
        lead = await session.get(Lead, lid)
        if lead:
            lead.status = "DISQUALIFIED"
            lead.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
            session.add(lead)
    await session.commit()
    return {"message": f"Successfully rejected {len(body.leadIds)} leads"}


class CleanAndRecrawlRequest(BaseModel):
    workspaceId: str


@router.post("/clean-and-recrawl")
async def clean_and_recrawl(
    body: CleanAndRecrawlRequest,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    """Clean historical duplicate social links and trigger re-crawl in background for all leads in workspace."""
    from app.runners.crawler import deduplicate_workspace_social_links
    import logging

    # 1. Clean duplicates and normalize/validate all existing links
    await deduplicate_workspace_social_links(session, body.workspaceId)
    
    # 2. Trigger re-crawl in the background
    async def bg_recrawl_workspace(workspace_id: str):
        bg_logger = logging.getLogger(__name__)
        bg_logger.info(f"Starting background re-crawl of workspace {workspace_id} social links...")
        
        from app.core.database import AsyncSessionLocal
        from app.runners.crawler import CrawlerRunner
        
        # Fetch leads again inside session
        async with AsyncSessionLocal() as bg_session:
            stmt = select(Lead).where(Lead.workspace_id == workspace_id)
            res = await bg_session.execute(stmt)
            leads = res.scalars().all()
            
            for lead in leads:
                if not lead.website:
                    continue
                try:
                    crawler = CrawlerRunner(bg_session)
                    await crawler.run(workspace_id=workspace_id, lead_id=lead.id)
                except Exception as e:
                    bg_logger.error(f"Error in bg re-crawl for lead {lead.id}: {e}")
            
    background_tasks.add_task(bg_recrawl_workspace, body.workspaceId)
    
    return {"status": "SUCCESS", "message": "Historical duplicates cleaned. Background re-crawl task started."}


from pydantic import BaseModel
from typing import Optional

class LeadDiscoveryRequest(BaseModel):
    workspaceId: str
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    industry: Optional[str] = None
    minEmployees: Optional[int] = None
    maxEmployees: Optional[int] = None
    fundingStage: Optional[str] = None
    revenueRange: Optional[str] = None


@router.post("/discover")
async def discover_leads(
    body: LeadDiscoveryRequest,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    """Trigger the Discovery Engine to scan directories, queue matching websites, and crawl them live."""
    from app.runners.discovery import LeadDiscoveryEngine
    import uuid
    from datetime import datetime

    engine = LeadDiscoveryEngine(session)
    result = await engine.run_discovery(
        workspace_id=body.workspaceId,
        country=body.country,
        state=body.state,
        city=body.city,
        industry=body.industry,
        min_employees=body.minEmployees,
        max_employees=body.maxEmployees,
        funding_stage=body.fundingStage,
        revenue_range=body.revenueRange
    )

    companies = result.get("companies", [])
    crawl_jobs = []
    
    # Track queued URLs to avoid creating duplicate jobs in this single request
    queued_urls = set()
    
    for comp in companies:
        url = comp["website"]
        if url not in queued_urls:
            job = CrawlJob(
                id=str(uuid.uuid4()),
                url=url,
                status="queued",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            session.add(job)
            crawl_jobs.append(job)
            queued_urls.add(url)
            
    # Query database for existing leads that match filters and haven't been crawled/processed
    db_query = select(Lead).where(
        Lead.workspace_id == body.workspaceId,
        Lead.status == "DISCOVERED"
    )
    if body.country:
        norm_c = normalize_country_name(body.country)
        if norm_c:
            db_query = db_query.where(Lead.country.ilike(norm_c))
    if body.state:
        db_query = db_query.where(Lead.state.ilike(body.state))
    if body.city:
        norm_city = normalize_city_name(body.city) or body.city
        db_query = db_query.where(or_(Lead.city.ilike(norm_city), Lead.city.ilike(body.city)))
    if body.industry:
        db_query = db_query.where(or_(Lead.sector.ilike(f"%{body.industry}%"), Lead.industry.ilike(f"%{body.industry}%")))
    if body.minEmployees is not None:
        db_query = db_query.where(Lead.employees >= body.minEmployees)
    if body.maxEmployees is not None:
        db_query = db_query.where(Lead.employees <= body.maxEmployees)
    if body.revenueRange:
        db_query = db_query.where(Lead.revenue_range == body.revenueRange)
        
    db_res = await session.execute(db_query)
    existing_leads = db_res.scalars().all()
    
    for lead in existing_leads:
        if not lead.website or lead.website in queued_urls:
            continue
            
        # Check if there is already an active crawl job for this URL
        active_job_stmt = select(CrawlJob).where(
            CrawlJob.url == lead.website,
            CrawlJob.status.in_(["queued", "crawling"])
        )
        active_job_res = await session.execute(active_job_stmt)
        if active_job_res.scalars().first():
            continue
            
        job = CrawlJob(
            id=str(uuid.uuid4()),
            url=lead.website,
            status="queued",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        session.add(job)
        crawl_jobs.append(job)
        queued_urls.add(lead.website)
        
    await session.commit()

    # Automatically trigger website crawl, email/phone/social extraction in the background using run_live_website_crawl
    for job in crawl_jobs:
        background_tasks.add_task(run_live_website_crawl, job.id, job.url, body.workspaceId)

    # Map jobs to CrawlJobOut format
    mapped_jobs = [_map_crawl_job(job) for job in crawl_jobs]

    return {
        "newLeadsAdded": len(crawl_jobs),
        "jobs": mapped_jobs,
        "stats": result.get("stats")
    }


@router.get("/discovery/stats")
async def get_discovery_stats(
    workspaceId: str = Query(...),
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    """Retrieve current Lead Discovery Hub analytics for the given workspace."""
    from app.runners.discovery import LeadDiscoveryEngine
    engine = LeadDiscoveryEngine(session)
    stats = await engine.compute_workspace_stats(workspaceId)
    return stats



def _map_crawl_job(job: CrawlJob) -> CrawlJobOut:
    return CrawlJobOut(
        id=job.id,
        url=job.url,
        status=job.status,
        leadId=job.lead_id,
        errorMessage=job.error_message,
        createdAt=job.created_at,
        updatedAt=job.updated_at,
        pagesCrawled=getattr(job, 'pages_crawled', 0) or 0,
        pagesTotal=getattr(job, 'pages_total', 0) or 0,
        crawlLogs=getattr(job, 'crawl_logs', None),
        technologiesFound=getattr(job, 'technologies_found', None),
    )



async def run_live_website_crawl(job_id: str, url: str, workspace_id: str):
    from app.core.database import AsyncSessionLocal
    from app.models.lead import (
        CrawlJob, Lead, LeadEmail, LeadPhone, LeadSocialLink,
        LeadSocialProfile, LeadContactPage, LeadAboutPage,
        LeadSupportPage, LeadCareersPage, LeadProductPage,
        AIInsight, QualificationReason
    )
    from app.runners.web_crawler import WebCrawler
    from app.runners.crawler import normalize_domain, determine_network, normalize_social_url, validate_social_url
    from app.runners.enrichment import EnrichmentRunner
    from app.runners.scoring import ScoringRunner
    from app.services.telemetry import (
        broadcast_crawl_log, broadcast_crawl_started,
        broadcast_crawl_complete, broadcast_crawl_error, broadcast_lead_qualified
    )
    import logging
    import json as json_lib
    from datetime import datetime, timezone

    bg_logger = logging.getLogger(__name__)
    bg_logger.info(f"Starting live website crawl job {job_id} for URL: {url}")

    # ── 1. Mark job as crawling ───────────────────────────────────────────────
    async with AsyncSessionLocal() as session:
        job = await session.get(CrawlJob, job_id)
        if not job:
            bg_logger.error(f"Crawl job {job_id} not found in DB.")
            return
        job.status = "crawling"
        job.updated_at = datetime.utcnow()
        session.add(job)
        await session.commit()

    await broadcast_crawl_started(job_id, url)

    try:
        # ── 2. Build real-time log callback ───────────────────────────────────
        crawl_log_buffer: list = []

        async def log_callback(message: str, pages_crawled: int, pages_total: int):
            crawl_log_buffer.append(message)
            bg_logger.info(f"[Crawl {job_id}] {message}")
            # Broadcast real-time to all WS clients
            await broadcast_crawl_log(job_id, message, pages_crawled, pages_total)
            # Persist log snapshot to DB periodically (every 5 pages)
            if len(crawl_log_buffer) % 5 == 0:
                async with AsyncSessionLocal() as snap_session:
                    snap_job = await snap_session.get(CrawlJob, job_id)
                    if snap_job:
                        snap_job.crawl_logs = json_lib.dumps(crawl_log_buffer[-50:])  # keep last 50 lines
                        snap_job.pages_crawled = pages_crawled
                        snap_job.pages_total = pages_total
                        snap_job.updated_at = datetime.utcnow()
                        snap_session.add(snap_job)
                        await snap_session.commit()

        # ── 3. Run the enhanced recursive crawler ─────────────────────────────
        crawler = WebCrawler(timeout=15, max_pages=30)
        crawl_res = await crawler.crawl_live_site(url, log_callback=log_callback)

        domain = normalize_domain(url)
        company_name = crawl_res.get("company_name") or domain or url
        description = crawl_res.get("description") or crawl_res.get("seo_description")
        seo_title = crawl_res.get("seo_title")
        seo_description = crawl_res.get("seo_description")
        technologies = crawl_res.get("technologies", [])
        job_count = crawl_res.get("job_count", 0)
        pages_crawled = crawl_res.get("pages_crawled", 0)
        country = crawl_res.get("country")
        city = crawl_res.get("city")
        state = crawl_res.get("state")
        postal_code = crawl_res.get("postal_code")
        full_address = crawl_res.get("full_address")
        latitude = crawl_res.get("latitude")
        longitude = crawl_res.get("longitude")
        
        # Determine hiring status from careers page and job count
        has_careers = len(crawl_res.get("careers_pages", [])) > 0
        hiring_status = "HIGH_VOLUME" if job_count > 10 else ("STABLE" if has_careers else "NONE")
        technologies_json = json_lib.dumps(technologies)

        # Normalize country/city before writing temp lead
        norm_country = normalize_country_name(country) or "Unknown"
        norm_city = normalize_city_name(city) or "Unknown"
        norm_state = state or "Unknown"

        # ── 4. In-Memory Extraction and AI Enrichment ─────────────────────────
        temp_lead = Lead(
            workspace_id=workspace_id,
            company_name=company_name,
            sector=crawl_res.get("industry") or "Unknown",
            industry=crawl_res.get("industry") or "Unknown",
            employees=0,  # Estimated/Scored later
            funding="Unknown",
            website=url,
            country=norm_country,
            city=norm_city,
            state=norm_state,
            postal_code=postal_code,
            full_address=full_address,
            latitude=latitude,
            longitude=longitude,
            revenue_range="Unknown",
            discovery_source="live_crawl",
            hiring_status=hiring_status,
            conversion_prob=0.0,
            ai_score=0,
            status="CRAWLED",
            description=description,
            seo_title=seo_title,
            seo_description=seo_description,
            technologies=technologies_json,
            job_count=job_count,
            pages_crawled=pages_crawled,
            job_listings=json_lib.dumps(crawl_res.get("job_listings", [])),
        )

        temp_emails = [
            LeadEmail(email=e, source_url=url, discovery_page=url, crawl_timestamp=datetime.utcnow(), confidence_score=0.9)
            for e in crawl_res.get("emails", [])
        ]
        temp_phones = [
            LeadPhone(phone=p, source_url=url, discovery_page=url, crawl_timestamp=datetime.utcnow(), confidence_score=0.9)
            for p in crawl_res.get("phone_numbers", [])
        ]
        temp_socials = [
            LeadSocialProfile(social_url=normalize_social_url(s), network=determine_network(s), source_url=url, discovery_page=url, crawl_timestamp=datetime.utcnow(), confidence_score=0.95, validation_status="VALID")
            for s in crawl_res.get("social_profiles", [])
            if normalize_social_url(s) and validate_social_url(normalize_social_url(s))
        ]

        # Build hiring_departments from job listings
        job_listings_raw = crawl_res.get("job_listings", [])
        from app.runners.web_crawler import normalize_job_department
        unique_depts = list(dict.fromkeys(
            normalize_job_department(j.get("title", ""))
            for j in job_listings_raw
            if j.get("title") and normalize_job_department(j.get("title", "")) != "Unknown"
        ))
        hiring_departments_json = json_lib.dumps(unique_depts) if unique_depts else None
        temp_lead.hiring_departments = hiring_departments_json

        temp_contacts = [
            LeadContactPage(url=normalize_social_url(u), source_url=url, discovery_page=url, crawl_timestamp=datetime.utcnow(), confidence_score=1.0)
            for u in crawl_res.get("contact_pages", []) if normalize_social_url(u)
        ]
        temp_abouts = [
            LeadAboutPage(url=normalize_social_url(u), source_url=url, discovery_page=url, crawl_timestamp=datetime.utcnow(), confidence_score=1.0)
            for u in crawl_res.get("about_pages", []) if normalize_social_url(u)
        ]
        temp_supports = [
            LeadSupportPage(url=normalize_social_url(u), source_url=url, discovery_page=url, crawl_timestamp=datetime.utcnow(), confidence_score=1.0)
            for u in crawl_res.get("support_pages", []) if normalize_social_url(u)
        ]
        temp_careers = [
            LeadCareersPage(url=normalize_social_url(u), source_url=url, discovery_page=url, crawl_timestamp=datetime.utcnow(), confidence_score=1.0)
            for u in crawl_res.get("careers_pages", []) if normalize_social_url(u)
        ]
        temp_products = [
            LeadProductPage(url=normalize_social_url(u), source_url=url, discovery_page=url, crawl_timestamp=datetime.utcnow(), confidence_score=1.0)
            for u in crawl_res.get("product_pages", []) if normalize_social_url(u)
        ]

        # Generate insights in-memory
        enricher = EnrichmentRunner(session=None)
        insights = enricher._generate_insights(
            lead=temp_lead,
            emails=temp_emails,
            phones=temp_phones,
            socials=temp_socials,
            contact_pages=temp_contacts,
            careers_pages=temp_careers,
            product_pages=temp_products,
            about_pages=temp_abouts,
            technologies=technologies,
        )

        # ── 5. In-Memory AI Lead Scoring ──────────────────────────────────────
        pricing_page_found = any(
            "pricing" in p.url.lower() or "plans" in p.url.lower() or "price" in p.url.lower()
            for p in temp_products
        )
        score = ScoringRunner._calculate_score(
            temp_lead,
            signals=[],
            emails_count=len(temp_emails),
            phones_count=len(temp_phones),
            social_count=len(temp_socials),
            contact_count=len(temp_contacts),
            careers_count=len(temp_careers),
            technologies=technologies,
            pricing_page_found=pricing_page_found,
        )
        conv_prob = ScoringRunner._calculate_conversion_probability(temp_lead, score)

        temp_lead.ai_score = score
        temp_lead.conversion_prob = conv_prob

        if score >= 75:
            temp_lead.status = "QUALIFIED"
        else:
            temp_lead.status = "CRAWLED"

        # Generate reasons
        reasons_text = ScoringRunner._generate_qualification_reasons(
            temp_lead,
            emails_count=len(temp_emails),
            phones_count=len(temp_phones),
            social_count=len(temp_socials),
            careers_count=len(temp_careers),
        )

        # ── 6. Cache to DB (Final Step) ───────────────────────────────────────
        async with AsyncSessionLocal() as session:
            job = await session.get(CrawlJob, job_id)
            if not job:
                return

            # Find existing lead with same domain in the workspace
            stmt = select(Lead).where(
                Lead.workspace_id == workspace_id,
                Lead.website != None
            )
            existing_res = await session.execute(stmt)
            existing_leads = existing_res.scalars().all()
            lead_obj = None
            for l in existing_leads:
                if l.website and normalize_domain(l.website) == domain:
                    lead_obj = l
                    break

            if not lead_obj:
                lead_obj = Lead(
                    workspace_id=workspace_id,
                    company_name=temp_lead.company_name,
                    sector=temp_lead.sector,
                    industry=temp_lead.industry,
                    employees=temp_lead.employees,
                    funding=temp_lead.funding,
                    website=temp_lead.website,
                    country=normalize_country_name(temp_lead.country) or "Unknown",
                    city=normalize_city_name(temp_lead.city) or "Unknown",
                    state=temp_lead.state,
                    postal_code=temp_lead.postal_code,
                    full_address=temp_lead.full_address,
                    latitude=temp_lead.latitude,
                    longitude=temp_lead.longitude,
                    revenue_range=temp_lead.revenue_range,
                    discovery_source=temp_lead.discovery_source,
                    hiring_status=temp_lead.hiring_status,
                    conversion_prob=temp_lead.conversion_prob,
                    ai_score=temp_lead.ai_score,
                    status=temp_lead.status,
                    description=temp_lead.description,
                    seo_title=temp_lead.seo_title,
                    seo_description=temp_lead.seo_description,
                    technologies=temp_lead.technologies,
                    job_count=temp_lead.job_count,
                    job_listings=temp_lead.job_listings,
                    hiring_departments=temp_lead.hiring_departments,
                    pages_crawled=temp_lead.pages_crawled,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                session.add(lead_obj)
                await session.flush()
            else:
                # Update existing lead fields
                if lead_obj.company_name == domain:
                    lead_obj.company_name = temp_lead.company_name
                lead_obj.hiring_status = temp_lead.hiring_status
                lead_obj.description = temp_lead.description or lead_obj.description
                lead_obj.seo_title = temp_lead.seo_title or lead_obj.seo_title
                lead_obj.seo_description = temp_lead.seo_description or lead_obj.seo_description
                lead_obj.technologies = temp_lead.technologies
                lead_obj.job_count = max(lead_obj.job_count, temp_lead.job_count)
                lead_obj.job_listings = temp_lead.job_listings
                lead_obj.hiring_departments = temp_lead.hiring_departments or lead_obj.hiring_departments
                lead_obj.pages_crawled = temp_lead.pages_crawled
                lead_obj.ai_score = temp_lead.ai_score
                lead_obj.conversion_prob = temp_lead.conversion_prob
                lead_obj.status = temp_lead.status
                # Always update location with normalized values
                new_country = normalize_country_name(temp_lead.country)
                new_city = normalize_city_name(temp_lead.city)
                if new_country and new_country != "Unknown":
                    lead_obj.country = new_country
                if new_city and new_city != "Unknown":
                    lead_obj.city = new_city
                if temp_lead.state and temp_lead.state != "Unknown":
                    lead_obj.state = temp_lead.state
                if temp_lead.postal_code:
                    lead_obj.postal_code = temp_lead.postal_code
                if temp_lead.full_address:
                    lead_obj.full_address = temp_lead.full_address
                if temp_lead.latitude is not None:
                    lead_obj.latitude = temp_lead.latitude
                if temp_lead.longitude is not None:
                    lead_obj.longitude = temp_lead.longitude
                lead_obj.updated_at = datetime.utcnow()
                session.add(lead_obj)
                await session.flush()

            # Cache emails
            first_email = None
            for em in temp_emails:
                email_stmt = select(LeadEmail).where(
                    LeadEmail.lead_id == lead_obj.id,
                    LeadEmail.email == em.email
                )
                if not (await session.execute(email_stmt)).scalars().first():
                    em.lead_id = lead_obj.id
                    session.add(em)
                if not first_email:
                    first_email = em.email

            # Cache phones
            first_phone = None
            for ph in temp_phones:
                phone_stmt = select(LeadPhone).where(
                    LeadPhone.lead_id == lead_obj.id,
                    LeadPhone.phone == ph.phone
                )
                if not (await session.execute(phone_stmt)).scalars().first():
                    ph.lead_id = lead_obj.id
                    session.add(ph)
                if not first_phone:
                    first_phone = ph.phone

            # Cache social profiles
            for sp in temp_socials:
                profile_stmt = select(LeadSocialProfile).where(
                    LeadSocialProfile.lead_id == lead_obj.id,
                    LeadSocialProfile.social_url == sp.social_url
                )
                if not (await session.execute(profile_stmt)).scalars().first():
                    sp.lead_id = lead_obj.id
                    session.add(sp)

            # Cache pages
            page_map = [
                (temp_contacts, LeadContactPage),
                (temp_abouts, LeadAboutPage),
                (temp_supports, LeadSupportPage),
                (temp_careers, LeadCareersPage),
                (temp_products, LeadProductPage),
            ]
            for page_list, model_cls in page_map:
                for pg in page_list:
                    check_stmt = select(model_cls).where(
                        model_cls.lead_id == lead_obj.id,
                        model_cls.url == pg.url
                    )
                    if not (await session.execute(check_stmt)).scalars().first():
                        pg.lead_id = lead_obj.id
                        session.add(pg)

            # Cache insights
            existing_ins_stmt = select(AIInsight).where(AIInsight.lead_id == lead_obj.id)
            existing_ins = (await session.execute(existing_ins_stmt)).scalars().all()
            existing_summaries = {ins.summary for ins in existing_ins}
            for ins in insights:
                if ins.summary not in existing_summaries:
                    ins.lead_id = lead_obj.id
                    session.add(ins)
                    existing_summaries.add(ins.summary)

            # Cache qualification reasons
            existing_reasons_stmt = select(QualificationReason).where(QualificationReason.lead_id == lead_obj.id)
            existing_reasons = (await session.execute(existing_reasons_stmt)).scalars().all()
            existing_reasons_desc = {r.description for r in existing_reasons}
            for r_text in reasons_text:
                if r_text not in existing_reasons_desc:
                    session.add(QualificationReason(
                        lead_id=lead_obj.id,
                        description=r_text,
                        passed=True
                    ))
                    existing_reasons_desc.add(r_text)

            # Update backward-compatibility fields on lead
            if not lead_obj.email and first_email:
                lead_obj.email = first_email
            if not lead_obj.phone and first_phone:
                lead_obj.phone = first_phone
            session.add(lead_obj)

            # Link job to lead
            job.lead_id = lead_obj.id
            job.status = "completed"
            job.pages_crawled = crawl_res.get("pages_crawled", 0)
            job.pages_total = crawl_res.get("pages_total", 0)
            job.crawl_logs = json_lib.dumps(crawl_log_buffer[-80:])
            job.technologies_found = technologies_json
            job.updated_at = datetime.utcnow()
            session.add(job)
            await session.commit()

            bg_logger.info(f"Crawl job {job_id} successfully cached. Lead ID: {lead_obj.id}")

            # ── 7. Stream Final Telemetry & Results ─────────────────────────
            emails_found = len(crawl_res.get("emails", []))
            phones_found = len(crawl_res.get("phone_numbers", []))
            socials_found = len(crawl_res.get("social_profiles", []))

            await broadcast_crawl_complete(
                job_id=job_id,
                lead_id=lead_obj.id,
                company_name=lead_obj.company_name,
                ai_score=lead_obj.ai_score,
                pages_crawled=crawl_res.get("pages_crawled", 0),
                technologies=technologies,
                emails_count=emails_found,
                phones_count=phones_found,
                socials_count=socials_found,
            )
            if lead_obj.ai_score >= 75:
                await broadcast_lead_qualified(lead_obj.id, lead_obj.company_name, lead_obj.ai_score)

    except Exception as e:
        bg_logger.exception(f"Failed live crawl job {job_id}: {e}")
        async with AsyncSessionLocal() as session:
            job = await session.get(CrawlJob, job_id)
            if job:
                job.status = "failed"
                job.error_message = str(e)
                job.updated_at = datetime.utcnow()
                session.add(job)
                await session.commit()
        await broadcast_crawl_error(job_id, url, str(e))


@router.post("/crawl", response_model=CrawlJobOut)
async def create_crawl_job(
    body: CrawlJobCreate,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    import uuid
    from datetime import datetime
    
    # Check if a crawl is already running or queued for this exact URL in this workspace to avoid redundancy
    stmt = select(CrawlJob).where(
        CrawlJob.url == body.url,
        CrawlJob.status.in_(["queued", "crawling"])
    )
    existing = (await session.execute(stmt)).scalars().first()
    if existing:
        return _map_crawl_job(existing)
        
    job = CrawlJob(
        id=str(uuid.uuid4()),
        url=body.url,
        status="queued",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)
    
    background_tasks.add_task(run_live_website_crawl, job.id, body.url, body.workspaceId)
    return _map_crawl_job(job)


@router.get("/crawl/{job_id}", response_model=CrawlJobOut)
async def get_crawl_job(
    job_id: str,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    job = await session.get(CrawlJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Crawl job not found")
    return _map_crawl_job(job)


@router.get("/crawl/{job_id}/results", response_model=LeadOut)
async def get_crawl_job_results(
    job_id: str,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    job = await session.get(CrawlJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Crawl job not found")
        
    if job.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Crawl job is in '{job.status}' status. Results are only available for completed jobs."
        )
        
    if not job.lead_id:
        raise HTTPException(status_code=404, detail="No lead associated with this completed crawl job")
        
    lead = await session.get(Lead, job.lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Associated lead not found")
        
    ins = await session.execute(select(AIInsight).where(AIInsight.lead_id == lead.id))
    sigs = await session.execute(select(IntentSignal).where(IntentSignal.lead_id == lead.id))
    reasons = await session.execute(select(QualificationReason).where(QualificationReason.lead_id == lead.id))
    
    from app.models.lead import (
        LeadEmail, LeadPhone, LeadSocialProfile, LeadContactPage, LeadAboutPage,
        LeadSupportPage, LeadCareersPage, LeadProductPage
    )
    emails_res = await session.execute(select(LeadEmail).where(LeadEmail.lead_id == lead.id))
    phones_res = await session.execute(select(LeadPhone).where(LeadPhone.lead_id == lead.id))
    profiles_res = await session.execute(select(LeadSocialProfile).where(LeadSocialProfile.lead_id == lead.id))
    contacts_res = await session.execute(select(LeadContactPage).where(LeadContactPage.lead_id == lead.id))
    abouts_res = await session.execute(select(LeadAboutPage).where(LeadAboutPage.lead_id == lead.id))
    supports_res = await session.execute(select(LeadSupportPage).where(LeadSupportPage.lead_id == lead.id))
    careers_res = await session.execute(select(LeadCareersPage).where(LeadCareersPage.lead_id == lead.id))
    products_res = await session.execute(select(LeadProductPage).where(LeadProductPage.lead_id == lead.id))

    return _map_lead(
        lead,
        insights=ins.scalars().all(),
        signals=sigs.scalars().all(),
        reasons=reasons.scalars().all(),
        emails=emails_res.scalars().all(),
        phones=phones_res.scalars().all(),
        social_profiles=profiles_res.scalars().all(),
        contact_pages=contacts_res.scalars().all(),
        about_pages=abouts_res.scalars().all(),
        support_pages=supports_res.scalars().all(),
        careers_pages=careers_res.scalars().all(),
        product_pages=products_res.scalars().all()
    )


@router.get("/crawl/{job_id}/diff")
async def get_crawl_job_diff(
    job_id: str,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    """
    Returns a structured diff of what was discovered during a crawl job.
    Shows: social profiles, emails, phones, contact/careers/about pages, score change.
    Used by UI to display 'NEW DATA DISCOVERED' panel after crawl completes.
    """
    job = await session.get(CrawlJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Crawl job not found")

    if not job.lead_id:
        return {
            "jobId": job_id,
            "status": job.status,
            "url": job.url,
            "leadId": None,
            "discovered": {},
            "summary": [],
        }

    from sqlalchemy import func as sqlfunc
    from app.models.lead import (
        LeadEmail, LeadPhone, LeadSocialProfile, LeadContactPage,
        LeadAboutPage, LeadSupportPage, LeadCareersPage, LeadProductPage
    )

    lead = await session.get(Lead, job.lead_id)

    # Gather counts from all typed tables
    emails = (await session.execute(select(LeadEmail).where(LeadEmail.lead_id == job.lead_id))).scalars().all()
    phones = (await session.execute(select(LeadPhone).where(LeadPhone.lead_id == job.lead_id))).scalars().all()
    social_profiles = (await session.execute(select(LeadSocialProfile).where(LeadSocialProfile.lead_id == job.lead_id))).scalars().all()
    contact_pages = (await session.execute(select(LeadContactPage).where(LeadContactPage.lead_id == job.lead_id))).scalars().all()
    about_pages = (await session.execute(select(LeadAboutPage).where(LeadAboutPage.lead_id == job.lead_id))).scalars().all()
    support_pages = (await session.execute(select(LeadSupportPage).where(LeadSupportPage.lead_id == job.lead_id))).scalars().all()
    careers_pages = (await session.execute(select(LeadCareersPage).where(LeadCareersPage.lead_id == job.lead_id))).scalars().all()
    product_pages = (await session.execute(select(LeadProductPage).where(LeadProductPage.lead_id == job.lead_id))).scalars().all()
    reasons = (await session.execute(select(QualificationReason).where(QualificationReason.lead_id == job.lead_id))).scalars().all()

    # Build human-readable summary
    summary = []
    if len(social_profiles) > 0:
        networks = ", ".join(sorted(set(s.network for s in social_profiles)))
        summary.append(f"{len(social_profiles)} Social Profile(s) Found ({networks})")
    if len(emails) > 0:
        summary.append(f"{len(emails)} Email Address(es) Discovered")
    if len(phones) > 0:
        summary.append(f"{len(phones)} Phone Number(s) Discovered")
    if len(contact_pages) > 0:
        summary.append(f"{len(contact_pages)} Contact Page(s) Found")
    if len(about_pages) > 0:
        summary.append(f"{len(about_pages)} About Page(s) Found")
    if len(careers_pages) > 0:
        summary.append(f"{len(careers_pages)} Careers Page(s) Found — Hiring Signal Detected")
    if len(support_pages) > 0:
        summary.append(f"{len(support_pages)} Support Page(s) Found")
    if len(product_pages) > 0:
        summary.append(f"{len(product_pages)} Product/Pricing Page(s) Found")

    return {
        "jobId": job_id,
        "status": job.status,
        "url": job.url,
        "leadId": job.lead_id,
        "leadName": lead.company_name if lead else None,
        "aiScore": lead.ai_score if lead else None,
        "status_lead": lead.status if lead else None,
        "crawlStarted": job.created_at.isoformat() if job.created_at else None,
        "crawlCompleted": job.updated_at.isoformat() if job.updated_at else None,
        "discovered": {
            "emailsFound": len(emails),
            "phonesFound": len(phones),
            "socialProfilesFound": len(social_profiles),
            "contactPagesFound": len(contact_pages),
            "aboutPagesFound": len(about_pages),
            "supportPagesFound": len(support_pages),
            "careersPagesFound": len(careers_pages),
            "productPagesFound": len(product_pages),
            "socialProfiles": [
                {"url": s.social_url, "network": s.network, "validationStatus": s.validation_status}
                for s in social_profiles
            ],
            "emails": [e.email for e in emails],
            "phones": [p.phone for p in phones],
        },
        "qualificationReasons": [r.description for r in reasons],
        "summary": summary if summary else ["No new data discovered during this crawl"],
        "errorMessage": job.error_message,
    }


# ── Cascading dynamic location discovery ──────────────────────────────────────────
CASCADING_LOCATIONS = {
    "India": {
        "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Navi Mumbai"],
        "Karnataka": ["Bengaluru", "Bangalore", "Mysore", "Hubli", "Mangalore"],
        "Delhi": ["New Delhi", "Dwarka", "Saket"],
        "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
        "Telangana": ["Hyderabad", "Secunderabad"],
        "Haryana": ["Gurugram", "Faridabad"],
        "Uttar Pradesh": ["Noida", "Lucknow", "Kanpur"]
    },
    "United States": {
        "California": ["San Francisco", "Los Angeles", "San Diego", "San Jose", "Palo Alto"],
        "New York": ["New York", "Buffalo", "Rochester"],
        "Texas": ["Austin", "Houston", "Dallas"],
        "Washington": ["Seattle", "Bellevue", "Redmond"],
        "Massachusetts": ["Boston", "Cambridge"],
        "Illinois": ["Chicago"]
    },
    "United Kingdom": {
        "England": ["London", "Manchester", "Birmingham", "Leeds"],
        "Scotland": ["Edinburgh", "Glasgow"]
    },
    "Germany": {
        "Berlin": ["Berlin"],
        "Bavaria": ["Munich"],
        "Hamburg": ["Hamburg"]
    },
    "Singapore": {
        "Central": ["Singapore"]
    },
    "Canada": {
        "Ontario": ["Toronto", "Ottawa"],
        "British Columbia": ["Vancouver", "Victoria"]
    },
    "Australia": {
        "New South Wales": ["Sydney"],
        "Victoria": ["Melbourne"]
    }
}

DISCOVERY_URLS = {
    "India": {
        "Maharashtra": {
            "Pune": ["https://www.firstcry.com/", "https://pubmatic.com/", "https://www.quickheal.co.in/"],
            "Mumbai": ["https://www.lakmeindia.com/", "https://www.nykaa.com/", "https://www.tcs.com/", "https://www.bookmyshow.com/"]
        },
        "Karnataka": {
            "Bengaluru": ["https://razorpay.com/", "https://www.infosys.com/", "https://www.flipkart.com/", "https://www.wipro.com/"],
            "Bangalore": ["https://razorpay.com/", "https://www.infosys.com/", "https://www.flipkart.com/", "https://www.wipro.com/"]
        },
        "Tamil Nadu": {
            "Chennai": ["https://www.freshworks.com/", "https://www.zoho.com/"]
        },
        "Uttar Pradesh": {
            "Noida": ["https://www.deuglo.com/", "https://www.paytm.com/", "https://www.hcltech.com/"]
        }
    },
    "United States": {
        "California": {
            "San Francisco": ["https://notion.so/", "https://www.stripe.com/", "https://www.airbnb.com/"],
            "Palo Alto": ["https://www.tesla.com/", "https://www.hp.com/"]
        },
        "Washington": {
            "Seattle": ["https://www.microsoft.com/", "https://www.amazon.com/"]
        },
        "New York": {
            "New York": ["https://www.mongodb.com/", "https://www.squarespace.com/"]
        }
    }
}

@router.get("/locations/countries")
async def get_countries(
    workspaceId: str = Query(default=None),
    session: AsyncSession = Depends(get_session),
    current_user: CurrentUser = None
):
    """Return all unique countries from crawled leads in the database, merged with predefined ones."""
    query = select(Lead.country).distinct().where(
        Lead.country != None,
        Lead.country != "Unknown",
        Lead.country != "UNKNOWN",
        Lead.country != ""
    )
    res = await session.execute(query)
    raw_countries = res.scalars().all()
    # Normalize all stored values and deduplicate
    normalized = {}
    for c in raw_countries:
        if not c:
            continue
        norm = normalize_country_name(c)
        if norm and norm.lower() != "unknown":
            normalized[norm.lower()] = norm  # dedup case-insensitively
    
    # Merge with static predefined locations
    for c in CASCADING_LOCATIONS.keys():
        normalized[c.lower()] = c
        
    return sorted(normalized.values())


@router.get("/locations/states")
async def get_states(
    country: str = Query(...),
    workspaceId: str = Query(default=None),
    session: AsyncSession = Depends(get_session),
    current_user: CurrentUser = None
):
    """Return all unique states from crawled leads for the given country, merged with predefined ones."""
    norm_country = normalize_country_name(country) or country
    query = select(Lead.state).distinct().where(
        Lead.country.ilike(norm_country),
        Lead.state != None,
        Lead.state != "Unknown",
        Lead.state != "UNKNOWN",
        Lead.state != ""
    )
    res = await session.execute(query)
    raw_states = res.scalars().all()
    
    # Normalize state names to standard full names
    normalized_states = set()
    for s in raw_states:
        if not s or s.lower() in ("unknown", ""):
            continue
        s_clean = s.strip()
        if norm_country.lower() == "united states" and s_clean.lower() in US_STATE_CODES:
            normalized_states.add(US_STATE_CODES[s_clean.lower()])
        else:
            normalized_states.add(s_clean)
    
    # Merge with static predefined locations
    matched_predefined = []
    for c_key, states_dict in CASCADING_LOCATIONS.items():
        if c_key.lower() == norm_country.lower():
            matched_predefined = list(states_dict.keys())
            break
            
    all_states = normalized_states.union(matched_predefined)
    return sorted(list(all_states))


@router.get("/locations/cities")
async def get_cities(
    country: str = Query(...),
    state: str = Query(...),
    workspaceId: str = Query(default=None),
    session: AsyncSession = Depends(get_session),
    current_user: CurrentUser = None
):
    """Return all unique cities from crawled leads for the given country+state, merged with predefined ones."""
    norm_country = normalize_country_name(country) or country
    state_syns = resolve_state_synonyms(state)
    query = select(Lead.city).distinct().where(
        Lead.country.ilike(norm_country),
        or_(*[Lead.state.ilike(s) for s in state_syns]),
        Lead.city != None,
        Lead.city != "Unknown",
        Lead.city != "UNKNOWN",
        Lead.city != ""
    )
    res = await session.execute(query)
    db_cities = [c for c in res.scalars().all() if c and c.lower() not in ("unknown", "")]
    
    # Merge with static predefined locations
    matched_predefined = []
    for c_key, states_dict in CASCADING_LOCATIONS.items():
        if c_key.lower() == norm_country.lower():
            for s_key, cities_list in states_dict.items():
                if s_key.lower() in [syn.lower() for syn in state_syns]:
                    matched_predefined = cities_list
                    break
            break
            
    all_cities = set(db_cities + matched_predefined)
    return sorted(list(all_cities))


@router.get("/filters/industries")
async def get_industries(
    workspaceId: str = Query(...),
    session: AsyncSession = Depends(get_session),
    current_user: CurrentUser = None
):
    """Return all unique industry sectors from leads in the workspace."""
    query = select(Lead.sector).distinct().where(
        Lead.workspace_id == workspaceId,
        Lead.sector != None,
        Lead.sector != "",
        Lead.sector != "Unknown"
    )
    res = await session.execute(query)
    industries = [i.strip() for i in res.scalars().all() if i]
    return sorted(list(set(industries)))


@router.get("/filters/sub-industries")
async def get_sub_industries(
    workspaceId: str = Query(...),
    session: AsyncSession = Depends(get_session),
    current_user: CurrentUser = None
):
    """Return all unique sub-industries from leads in the workspace."""
    query = select(Lead.industry).distinct().where(
        Lead.workspace_id == workspaceId,
        Lead.industry != None,
        Lead.industry != "",
        Lead.industry != "Unknown"
    )
    res = await session.execute(query)
    sub_industries = [i.strip() for i in res.scalars().all() if i]
    return sorted(list(set(sub_industries)))


@router.get("/filters/funding-stages")
async def get_funding_stages(
    workspaceId: str = Query(...),
    session: AsyncSession = Depends(get_session),
    current_user: CurrentUser = None
):
    """Return all unique funding stages from leads in the workspace."""
    query = select(Lead.funding).distinct().where(
        Lead.workspace_id == workspaceId,
        Lead.funding != None,
        Lead.funding != "",
        Lead.funding != "Unknown"
    )
    res = await session.execute(query)
    raw_funding = res.scalars().all()
    stages = set()
    for f in raw_funding:
        if not f:
            continue
        f_lower = f.lower()
        if "seed" in f_lower:
            stages.add("Seed")
        elif "series a" in f_lower:
            stages.add("Series A")
        elif "series b" in f_lower:
            stages.add("Series B")
        elif "series c" in f_lower:
            stages.add("Series C")
        elif "series d" in f_lower:
            stages.add("Series D")
        elif "series e" in f_lower:
            stages.add("Series E")
        elif "ipo" in f_lower or "public" in f_lower:
            stages.add("Public")
        elif "acquired" in f_lower:
            stages.add("Acquired")
        else:
            stages.add(f.strip())
    return sorted(list(stages))


@router.get("/filters/revenue-ranges")
async def get_revenue_ranges(
    workspaceId: str = Query(...),
    session: AsyncSession = Depends(get_session),
    current_user: CurrentUser = None
):
    """Return all unique revenue ranges from leads in the workspace."""
    query = select(Lead.revenue_range).distinct().where(
        Lead.workspace_id == workspaceId,
        Lead.revenue_range != None,
        Lead.revenue_range != "",
        Lead.revenue_range != "Unknown"
    )
    res = await session.execute(query)
    ranges = [r.strip() for r in res.scalars().all() if r]
    return sorted(list(set(ranges)))


@router.get("/filters/hiring-statuses")
async def get_hiring_statuses(
    workspaceId: str = Query(...),
    session: AsyncSession = Depends(get_session),
    current_user: CurrentUser = None
):
    """Return all unique hiring statuses from leads in the workspace."""
    query = select(Lead.hiring_status).distinct().where(
        Lead.workspace_id == workspaceId,
        Lead.hiring_status != None,
        Lead.hiring_status != ""
    )
    res = await session.execute(query)
    statuses = [s.strip() for s in res.scalars().all() if s]
    return sorted(list(set(statuses)))


@router.get("/filters/technologies")
async def get_technologies(
    workspaceId: str = Query(...),
    session: AsyncSession = Depends(get_session),
    current_user: CurrentUser = None
):
    """Return all unique technologies detected across leads in the workspace."""
    query = select(Lead.technologies).where(
        Lead.workspace_id == workspaceId,
        Lead.technologies != None,
        Lead.technologies != "",
        Lead.technologies != "[]"
    )
    res = await session.execute(query)
    raw_techs = res.scalars().all()
    techs_set = set()
    import json
    for t_str in raw_techs:
        try:
            tech_list = json.loads(t_str)
            if isinstance(tech_list, list):
                for t in tech_list:
                    if t:
                        techs_set.add(t.strip())
        except Exception:
            if "," in t_str:
                for t in t_str.split(","):
                    techs_set.add(t.strip())
            else:
                techs_set.add(t_str.strip())
    return sorted(list(techs_set))


@router.get("/filters/departments")
async def get_departments(
    workspaceId: str = Query(...),
    session: AsyncSession = Depends(get_session),
    current_user: CurrentUser = None
):
    """Return all unique hiring departments detected across leads in the workspace."""
    query = select(Lead.hiring_departments).where(
        Lead.workspace_id == workspaceId,
        Lead.hiring_departments != None,
        Lead.hiring_departments != "",
        Lead.hiring_departments != "[]"
    )
    res = await session.execute(query)
    raw_depts = res.scalars().all()
    depts_set = set()
    import json
    for d_str in raw_depts:
        try:
            dept_list = json.loads(d_str)
            if isinstance(dept_list, list):
                for d in dept_list:
                    if d:
                        depts_set.add(d.strip())
        except Exception:
            if "," in d_str:
                for d in d_str.split(","):
                    depts_set.add(d.strip())
            else:
                depts_set.add(d_str.strip())
    return sorted(list(depts_set))


class LocationDiscoverRequest(BaseModel):
    country: str
    state: str
    city: str
    workspaceId: str

@router.post("/discover/location")
async def discover_by_location(
    body: LocationDiscoverRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    current_user: CurrentUser = None
):
    from app.runners.crawler import normalize_domain
    # Check count of existing leads in that city/state/country
    query = select(Lead).where(
        Lead.workspace_id == body.workspaceId,
        Lead.country.ilike(body.country),
        Lead.state.ilike(body.state),
        Lead.city.ilike(body.city)
    )
    res = await session.execute(query)
    existing_count = len(res.scalars().all())
    
    triggered_jobs = []
    # If below threshold of 3, trigger auto-discovery for matching curated domain URLs
    if existing_count < 3:
        # Find URLs matching the hierarchy
        country_match = {}
        for ck, cv in DISCOVERY_URLS.items():
            if ck.lower() == body.country.lower():
                country_match = cv
                break
        
        state_match = {}
        for sk, sv in country_match.items():
            if sk.lower() == body.state.lower():
                state_match = sv
                break
                
        urls = []
        for ck, cv in state_match.items():
            if ck.lower() == body.city.lower():
                urls = cv
                break
                
        # Trigger background crawl and enrich jobs
        for url in urls:
            domain = normalize_domain(url)
            # Check if domain already exists in workspace
            existing_query = select(Lead).where(
                Lead.workspace_id == body.workspaceId,
                Lead.website != None
            )
            all_leads_res = await session.execute(existing_query)
            already_exists = False
            for lead in all_leads_res.scalars().all():
                if lead.website and normalize_domain(lead.website) == domain:
                    if lead.country == body.country and lead.state == body.state and lead.city == body.city:
                        already_exists = True
                        break
            
            if not already_exists:
                job = CrawlJob(
                    id=str(uuid.uuid4()),
                    workspace_id=body.workspaceId,
                    url=url,
                    status="queued",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                session.add(job)
                await session.commit()
                
                background_tasks.add_task(run_live_website_crawl, job.id, url, body.workspaceId)
                triggered_jobs.append({
                    "jobId": job.id,
                    "url": url,
                    "status": "queued"
                })
                
    return {
        "status": "success",
        "existingCount": existing_count,
        "triggeredJobs": triggered_jobs
    }


# ── Parameterized /{lead_id} routes ──────────────────────────────────────────
# IMPORTANT: These MUST come AFTER all specific-path routes above.
# FastAPI matches routes top-to-bottom; /{lead_id} is a catch-all that would
# intercept /locations/*, /export/*, /discover/*, /crawl/*, etc.

@router.get("/{lead_id}", response_model=LeadOut)
async def get_lead(
    lead_id: str,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    lead = await session.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    ins = await session.execute(select(AIInsight).where(AIInsight.lead_id == lead_id))  # type: ignore
    sigs = await session.execute(select(IntentSignal).where(IntentSignal.lead_id == lead_id))  # type: ignore
    reasons = await session.execute(select(QualificationReason).where(QualificationReason.lead_id == lead_id))  # type: ignore

    from app.models.lead import (
        LeadEmail, LeadPhone, LeadSocialProfile, LeadContactPage, LeadAboutPage,
        LeadSupportPage, LeadCareersPage, LeadProductPage
    )
    emails_res = await session.execute(select(LeadEmail).where(LeadEmail.lead_id == lead_id))
    phones_res = await session.execute(select(LeadPhone).where(LeadPhone.lead_id == lead_id))
    profiles_res = await session.execute(select(LeadSocialProfile).where(LeadSocialProfile.lead_id == lead_id))
    contacts_res = await session.execute(select(LeadContactPage).where(LeadContactPage.lead_id == lead_id))
    abouts_res = await session.execute(select(LeadAboutPage).where(LeadAboutPage.lead_id == lead_id))
    supports_res = await session.execute(select(LeadSupportPage).where(LeadSupportPage.lead_id == lead_id))
    careers_res = await session.execute(select(LeadCareersPage).where(LeadCareersPage.lead_id == lead_id))
    products_res = await session.execute(select(LeadProductPage).where(LeadProductPage.lead_id == lead_id))

    return _map_lead(
        lead,
        insights=ins.scalars().all(),
        signals=sigs.scalars().all(),
        reasons=reasons.scalars().all(),
        emails=emails_res.scalars().all(),
        phones=phones_res.scalars().all(),
        social_profiles=profiles_res.scalars().all(),
        contact_pages=contacts_res.scalars().all(),
        about_pages=abouts_res.scalars().all(),
        support_pages=supports_res.scalars().all(),
        careers_pages=careers_res.scalars().all(),
        product_pages=products_res.scalars().all()
    )


@router.post("", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
async def create_lead(
    body: LeadCreate,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    lead = Lead(
        id=str(uuid.uuid4()),
        workspace_id=body.workspaceId,
        company_name=body.companyName,
        sector=body.sector,
        industry=body.industry,
        employees=body.employees or 0,
        funding=body.funding,
        website=body.website,
        email=body.email,
        phone=body.phone,
        hiring_status=body.hiringStatus or "NONE",
        conversion_prob=body.conversionProb or 50.0,
        ai_score=body.aiScore or 70,
        status=body.status or "DISCOVERED",
    )
    session.add(lead)
    await session.commit()
    await session.refresh(lead)
    return _map_lead(lead)


@router.put("/{lead_id}", response_model=LeadOut)
@router.patch("/{lead_id}", response_model=LeadOut)
async def update_lead(
    lead_id: str,
    body: LeadUpdate,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    from app.models.lead import (
        LeadEmail, LeadPhone, LeadSocialProfile, LeadContactPage, LeadAboutPage,
        LeadSupportPage, LeadCareersPage, LeadProductPage
    )
    # BUG FIX: fetch lead first before using it
    lead = await session.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Apply all provided fields from body
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        # Convert camelCase body fields to snake_case lead attributes
        snake = ''.join(['_' + c.lower() if c.isupper() else c for c in field]).lstrip('_')
        if hasattr(lead, snake) and value is not None:
            setattr(lead, snake, value)
    lead.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    session.add(lead)
    await session.commit()
    await session.refresh(lead)

    ins = await session.execute(select(AIInsight).where(AIInsight.lead_id == lead_id))
    sigs = await session.execute(select(IntentSignal).where(IntentSignal.lead_id == lead_id))
    emails_res = await session.execute(select(LeadEmail).where(LeadEmail.lead_id == lead_id))
    phones_res = await session.execute(select(LeadPhone).where(LeadPhone.lead_id == lead_id))
    profiles_res = await session.execute(select(LeadSocialProfile).where(LeadSocialProfile.lead_id == lead_id))
    contacts_res = await session.execute(select(LeadContactPage).where(LeadContactPage.lead_id == lead_id))
    abouts_res = await session.execute(select(LeadAboutPage).where(LeadAboutPage.lead_id == lead_id))
    supports_res = await session.execute(select(LeadSupportPage).where(LeadSupportPage.lead_id == lead_id))
    careers_res = await session.execute(select(LeadCareersPage).where(LeadCareersPage.lead_id == lead_id))
    products_res = await session.execute(select(LeadProductPage).where(LeadProductPage.lead_id == lead_id))

    return _map_lead(
        lead,
        insights=ins.scalars().all(),
        signals=sigs.scalars().all(),
        reasons=None,
        emails=emails_res.scalars().all(),
        phones=phones_res.scalars().all(),
        social_profiles=profiles_res.scalars().all(),
        contact_pages=contacts_res.scalars().all(),
        about_pages=abouts_res.scalars().all(),
        support_pages=supports_res.scalars().all(),
        careers_pages=careers_res.scalars().all(),
        product_pages=products_res.scalars().all()
    )


@router.delete("/{lead_id}")
async def delete_lead(
    lead_id: str,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    lead = await session.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    await session.delete(lead)
    await session.commit()
    return {"message": "Lead deleted successfully"}


@router.post("/{lead_id}/outreach")
async def generate_outreach(
    lead_id: str,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    """Generate AI-tailored outreach email draft for a specific lead."""
    lead = await session.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    ins_result = await session.execute(select(AIInsight).where(AIInsight.lead_id == lead_id))  # type: ignore
    sigs_result = await session.execute(select(IntentSignal).where(IntentSignal.lead_id == lead_id))  # type: ignore
    insights = ins_result.scalars().all()
    signals = sigs_result.scalars().all()

    primary_insight = insights[0].summary if insights else "rapid sector growth dynamics"
    primary_signal = signals[0].signal_type if signals else "pricing page visitor engagement"

    subject = f"Tailored alignment for {lead.company_name} + Deuglo AI"
    draft = f"""Hi {lead.company_name} Team,

I noticed your recent intent footprints indicating high interest in our Enterprise Intelligence suite, particularly around {primary_signal}.

With your recent indicator: "{primary_insight}", we see a major alignment factor. Many of our {lead.sector} partners leverage Deuglo AI to boost their pipelines.

Would love to schedule a quick 10-minute briefing next Tuesday to outline a custom pilot map.

Best,
Admin
Enterprise Admin | Deuglo AI"""

    return {
        "leadId": lead.id,
        "companyName": lead.company_name,
        "subject": subject,
        "emailDraft": draft,
        "confidence": lead.conversion_prob,
        "modelUsed": "GPT-4o (Premium)",
        "signalsSynthesizedCount": len(signals) + len(insights),
    }


@router.post("/{lead_id}/enrich", response_model=LeadOut)
async def enrich_lead(
    lead_id: str,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    """Trigger real web crawling, AI scoring, and profiling enrichment for a single lead."""
    lead = await session.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    from app.runners.crawler import CrawlerRunner
    from app.runners.scoring import ScoringRunner
    from app.runners.enrichment import EnrichmentRunner

    # 1. Run Crawler
    crawler = CrawlerRunner(session)
    await crawler.run(workspace_id=lead.workspace_id, lead_id=lead.id)

    # 2. Run Scorer
    scorer = ScoringRunner(session)
    await scorer.run(workspace_id=lead.workspace_id, lead_id=lead.id)

    # 3. Run Enricher
    enricher = EnrichmentRunner(session)
    await enricher.run(workspace_id=lead.workspace_id, lead_id=lead.id)

    # Reload the lead object and fetch all associated tables
    await session.refresh(lead)

    ins = await session.execute(select(AIInsight).where(AIInsight.lead_id == lead_id))  # type: ignore
    sigs = await session.execute(select(IntentSignal).where(IntentSignal.lead_id == lead_id))  # type: ignore
    reasons = await session.execute(select(QualificationReason).where(QualificationReason.lead_id == lead_id))  # type: ignore

    from app.models.lead import (
        LeadEmail, LeadPhone, LeadSocialProfile, LeadContactPage, LeadAboutPage,
        LeadSupportPage, LeadCareersPage, LeadProductPage
    )
    emails_res = await session.execute(select(LeadEmail).where(LeadEmail.lead_id == lead_id))
    phones_res = await session.execute(select(LeadPhone).where(LeadPhone.lead_id == lead_id))
    profiles_res = await session.execute(select(LeadSocialProfile).where(LeadSocialProfile.lead_id == lead_id))
    contacts_res = await session.execute(select(LeadContactPage).where(LeadContactPage.lead_id == lead_id))
    abouts_res = await session.execute(select(LeadAboutPage).where(LeadAboutPage.lead_id == lead_id))
    supports_res = await session.execute(select(LeadSupportPage).where(LeadSupportPage.lead_id == lead_id))
    careers_res = await session.execute(select(LeadCareersPage).where(LeadCareersPage.lead_id == lead_id))
    products_res = await session.execute(select(LeadProductPage).where(LeadProductPage.lead_id == lead_id))

    return _map_lead(
        lead,
        insights=ins.scalars().all(),
        signals=sigs.scalars().all(),
        reasons=reasons.scalars().all(),
        emails=emails_res.scalars().all(),
        phones=phones_res.scalars().all(),
        social_profiles=profiles_res.scalars().all(),
        contact_pages=contacts_res.scalars().all(),
        about_pages=abouts_res.scalars().all(),
        support_pages=supports_res.scalars().all(),
        careers_pages=careers_res.scalars().all(),
        product_pages=products_res.scalars().all()
    )


