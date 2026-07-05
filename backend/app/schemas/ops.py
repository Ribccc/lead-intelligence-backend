from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


# ── Pipeline Schemas ──────────────────────────────────────────────────────────
class PipelineNodeCreate(BaseModel):
    type: str
    name: str
    config: Optional[dict] = {}
    x: Optional[float] = 0.0
    y: Optional[float] = 0.0


class PipelineCreate(BaseModel):
    workspaceId: str
    name: str
    nodes: Optional[list[PipelineNodeCreate]] = []


class NodeCoordUpdate(BaseModel):
    id: str
    x: float
    y: float


class NodeCoordBatch(BaseModel):
    nodes: list[NodeCoordUpdate]


class PipelineNodeOut(BaseModel):
    id: str
    type: str
    name: str
    config: Any
    status: str
    throughput: float
    processed: int
    x: float
    y: float

    class Config:
        from_attributes = True


class PipelineEdgeOut(BaseModel):
    id: str
    source: str
    target: str

    class Config:
        from_attributes = True


class PipelineOut(BaseModel):
    id: str
    name: str
    isActive: bool
    nodes: list[PipelineNodeOut] = []
    edges: list[PipelineEdgeOut] = []
    createdAt: datetime

    class Config:
        from_attributes = True


# ── Campaign Schemas ──────────────────────────────────────────────────────────
class CampaignStepCreate(BaseModel):
    type: str
    name: Optional[str] = None
    config: Optional[dict] = {}


class CampaignCreate(BaseModel):
    workspaceId: str
    name: str
    steps: Optional[list[CampaignStepCreate]] = []


class CampaignStepUpdate(BaseModel):
    stepIndex: int
    type: str
    name: str
    config: Optional[dict] = {}


class CampaignStepsUpdate(BaseModel):
    steps: list[CampaignStepUpdate]


class CampaignStepOut(BaseModel):
    id: str
    stepIndex: int
    type: str
    name: str
    config: Any

    class Config:
        from_attributes = True


class CampaignOut(BaseModel):
    id: str
    name: str
    totalOutreach: int
    openRate: float
    replyRate: float
    bounceRate: float
    spamRisk: str
    creditsUsed: int
    creditsTotal: int
    isActive: bool
    stepsCount: Optional[int] = 0
    createdAt: datetime

    class Config:
        from_attributes = True


# ── Integration Schemas ───────────────────────────────────────────────────────
class IntegrationOut(BaseModel):
    id: str
    provider: str
    isActive: bool
    syncStatus: str
    recordsSynced: int
    lastSyncedAt: Optional[datetime]

    class Config:
        from_attributes = True
