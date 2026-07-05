from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import select
from app.core.database import get_session
from app.core.deps import CurrentUser
from app.models.campaign import Campaign, CampaignStep, CampaignLead
from app.models.lead import Lead
from app.schemas.ops import CampaignCreate, CampaignStepsUpdate, CampaignOut, CampaignStepOut
from datetime import datetime, timezone
import uuid
import json

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


def _map_campaign(campaign: Campaign, steps: list = None) -> CampaignOut:
    return CampaignOut(
        id=campaign.id,
        name=campaign.name,
        totalOutreach=campaign.total_outreach,
        openRate=campaign.open_rate,
        replyRate=campaign.reply_rate,
        bounceRate=campaign.bounce_rate,
        spamRisk=campaign.spam_risk,
        creditsUsed=campaign.credits_used,
        creditsTotal=campaign.credits_total,
        isActive=campaign.is_active,
        stepsCount=len(steps) if steps else 0,
        createdAt=campaign.created_at,
    )


@router.get("", response_model=list[CampaignOut])
async def list_campaigns(
    workspaceId: str = Query(...),
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Campaign).where(Campaign.workspace_id == workspaceId)  # type: ignore
    )
    campaigns = result.scalars().all()

    out = []
    for c in campaigns:
        steps_r = await session.execute(select(CampaignStep).where(CampaignStep.campaign_id == c.id))  # type: ignore
        out.append(_map_campaign(c, steps_r.scalars().all()))
    return out


@router.get("/{campaign_id}")
async def get_campaign(
    campaign_id: str,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    campaign = await session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    steps_r = await session.execute(
        select(CampaignStep)
        .where(CampaignStep.campaign_id == campaign_id)  # type: ignore
        .order_by(CampaignStep.step_index)  # type: ignore
    )
    steps = steps_r.scalars().all()

    cl_result = await session.execute(
        select(CampaignLead).where(CampaignLead.campaign_id == campaign_id)  # type: ignore
    )
    cl_records = cl_result.scalars().all()

    lead_details = []
    for cl in cl_records:
        lead = await session.get(Lead, cl.lead_id)
        if lead:
            lead_details.append({
                "leadId": lead.id,
                "companyName": lead.company_name,
                "currentStep": cl.current_step,
                "lastStatus": cl.last_status,
                "updatedAt": cl.updated_at,
            })

    return {
        "id": campaign.id,
        "name": campaign.name,
        "totalOutreach": campaign.total_outreach,
        "openRate": campaign.open_rate,
        "replyRate": campaign.reply_rate,
        "bounceRate": campaign.bounce_rate,
        "spamRisk": campaign.spam_risk,
        "creditsUsed": campaign.credits_used,
        "creditsTotal": campaign.credits_total,
        "isActive": campaign.is_active,
        "steps": [
            {
                "id": s.id,
                "stepIndex": s.step_index,
                "type": s.type,
                "name": s.name,
                "config": json.loads(s.config) if s.config else {},
            }
            for s in steps
        ],
        "leads": lead_details,
    }


@router.post("", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    body: CampaignCreate,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    campaign = Campaign(
        id=str(uuid.uuid4()),
        workspace_id=body.workspaceId,
        name=body.name,
        is_active=True,
    )
    session.add(campaign)
    await session.flush()

    steps = []
    for i, step in enumerate(body.steps or []):
        s = CampaignStep(
            id=str(uuid.uuid4()),
            campaign_id=campaign.id,
            step_index=i + 1,
            type=step.type,
            name=step.name or f"Step {i+1}: {step.type}",
            config=json.dumps(step.config or {}),
        )
        session.add(s)
        steps.append(s)

    await session.commit()
    await session.refresh(campaign)
    return _map_campaign(campaign, steps)


@router.put("/{campaign_id}/steps")
async def save_campaign_steps(
    campaign_id: str,
    body: CampaignStepsUpdate,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    # Delete existing steps
    existing = await session.execute(
        select(CampaignStep).where(CampaignStep.campaign_id == campaign_id)  # type: ignore
    )
    for step in existing.scalars().all():
        await session.delete(step)

    # Insert new steps
    for step in body.steps:
        s = CampaignStep(
            id=str(uuid.uuid4()),
            campaign_id=campaign_id,
            step_index=step.stepIndex,
            type=step.type,
            name=step.name,
            config=json.dumps(step.config or {}),
        )
        session.add(s)

    await session.commit()
    return {"message": "Campaign sequence steps updated successfully."}


@router.patch("/{campaign_id}/toggle")
@router.post("/{campaign_id}/toggle")
async def toggle_campaign(
    campaign_id: str,
    current_user: CurrentUser = None,
    session: AsyncSession = Depends(get_session),
):
    campaign = await session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.is_active = not campaign.is_active
    campaign.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    session.add(campaign)
    await session.commit()

    return {
        "message": f"Campaign successfully {'activated' if campaign.is_active else 'paused'}.",
        "isActive": campaign.is_active,
    }
