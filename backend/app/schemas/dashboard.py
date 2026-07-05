from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class KPIsOut(BaseModel):
    revenuePipeline: float
    qualifiedLeads: int
    activeCampaigns: int
    aiAccuracy: float
    avgVelocityLpm: float


class ChartPoint(BaseModel):
    label: str
    leadGrowth: int
    aiQualified: int


class ConversionChartOut(BaseModel):
    growthSeries: list[ChartPoint]
    summary: str


class ActivityFeedItemOut(BaseModel):
    id: str
    type: str
    title: str
    description: str
    score: Optional[int]
    meta: Optional[Any]
    createdAt: datetime

    class Config:
        from_attributes = True


class WorkspaceOut(BaseModel):
    id: str
    name: str
    logoUrl: Optional[str]
    createdAt: datetime
    memberCount: Optional[int] = 0

    class Config:
        from_attributes = True


class HealthOut(BaseModel):
    status: str
    dbConnection: str
    timestamp: datetime
    service: str
    apiVersion: str
