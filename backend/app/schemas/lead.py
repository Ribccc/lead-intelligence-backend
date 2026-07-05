from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class LeadCreate(BaseModel):
    workspaceId: str
    companyName: str
    sector: str
    industry: str
    employees: Optional[int] = 0
    funding: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    hiringStatus: Optional[str] = "NONE"
    conversionProb: Optional[float] = 50.0
    aiScore: Optional[int] = 70
    status: Optional[str] = "DISCOVERED"


class LeadUpdate(BaseModel):
    companyName: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    employees: Optional[int] = None
    funding: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    hiringStatus: Optional[str] = None
    conversionProb: Optional[float] = None
    aiScore: Optional[int] = None
    status: Optional[str] = None


class IntentSignalOut(BaseModel):
    id: str
    signalType: str
    volume: int
    intensity: str
    detectedAt: datetime

    class Config:
        from_attributes = True


class AIInsightOut(BaseModel):
    id: str
    summary: str
    sourceType: str
    createdAt: datetime

    class Config:
        from_attributes = True


class QualificationReasonOut(BaseModel):
    id: str
    description: str
    passed: bool
    checkedAt: datetime

    class Config:
        from_attributes = True


class LeadEmailOut(BaseModel):
    id: str
    leadId: str
    email: str
    sourceUrl: str
    discoveryPage: Optional[str]
    crawlTimestamp: datetime
    confidenceScore: float

    class Config:
        from_attributes = True


class LeadPhoneOut(BaseModel):
    id: str
    leadId: str
    phone: str
    sourceUrl: str
    discoveryPage: Optional[str]
    crawlTimestamp: datetime
    confidenceScore: float

    class Config:
        from_attributes = True


class LeadSocialLinkOut(BaseModel):
    id: str
    leadId: str
    socialUrl: str
    network: str
    sourceUrl: str
    discoveryPage: Optional[str]
    crawlTimestamp: datetime
    confidenceScore: float
    validationStatus: str

    class Config:
        from_attributes = True


class LeadSocialProfileOut(BaseModel):
    id: str
    leadId: str
    socialUrl: str
    network: str
    sourceUrl: str
    discoveryPage: Optional[str]
    crawlTimestamp: datetime
    confidenceScore: float
    validationStatus: str

    class Config:
        from_attributes = True


class LeadContactPageOut(BaseModel):
    id: str
    leadId: str
    url: str
    sourceUrl: str
    discoveryPage: Optional[str]
    crawlTimestamp: datetime
    confidenceScore: float

    class Config:
        from_attributes = True


class LeadAboutPageOut(BaseModel):
    id: str
    leadId: str
    url: str
    sourceUrl: str
    discoveryPage: Optional[str]
    crawlTimestamp: datetime
    confidenceScore: float

    class Config:
        from_attributes = True


class LeadSupportPageOut(BaseModel):
    id: str
    leadId: str
    url: str
    sourceUrl: str
    discoveryPage: Optional[str]
    crawlTimestamp: datetime
    confidenceScore: float

    class Config:
        from_attributes = True


class LeadCareersPageOut(BaseModel):
    id: str
    leadId: str
    url: str
    sourceUrl: str
    discoveryPage: Optional[str]
    crawlTimestamp: datetime
    confidenceScore: float

    class Config:
        from_attributes = True


class LeadProductPageOut(BaseModel):
    id: str
    leadId: str
    url: str
    sourceUrl: str
    discoveryPage: Optional[str]
    crawlTimestamp: datetime
    confidenceScore: float

    class Config:
        from_attributes = True


class LeadContactsOut(BaseModel):
    emails: list[LeadEmailOut] = []
    phones: list[LeadPhoneOut] = []
    socialLinks: list[LeadSocialLinkOut] = []
    socialProfiles: list[LeadSocialProfileOut] = []
    contactPages: list[LeadContactPageOut] = []
    aboutPages: list[LeadAboutPageOut] = []
    supportPages: list[LeadSupportPageOut] = []
    careersPages: list[LeadCareersPageOut] = []
    productPages: list[LeadProductPageOut] = []


class LeadOut(BaseModel):
    id: str
    workspaceId: str
    companyName: str
    sector: str
    industry: str
    employees: int
    funding: Optional[str]
    website: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    country: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postalCode: Optional[str] = None
    fullAddress: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    revenueRange: Optional[str] = None
    discoverySource: Optional[str] = None
    hiringStatus: str
    conversionProb: float
    aiScore: int
    confidenceScore: float
    status: str
    createdAt: datetime
    updatedAt: datetime
    # Intelligence fields from live crawl
    description: Optional[str] = None
    seoTitle: Optional[str] = None
    seoDescription: Optional[str] = None
    technologies: Optional[str] = None      # JSON string, parsed on frontend
    jobCount: int = 0
    pagesCrawled: int = 0
    jobListings: Optional[str] = None       # JSON string list of job title/department pairs
    insights: list[AIInsightOut] = []
    intentSignals: list[IntentSignalOut] = []
    reasoningPoints: list[QualificationReasonOut] = []
    emails: list[LeadEmailOut] = []
    phones: list[LeadPhoneOut] = []
    socialLinks: list[LeadSocialLinkOut] = []
    socialProfiles: list[LeadSocialProfileOut] = []
    contactPages: list[LeadContactPageOut] = []
    aboutPages: list[LeadAboutPageOut] = []
    supportPages: list[LeadSupportPageOut] = []
    careersPages: list[LeadCareersPageOut] = []
    productPages: list[LeadProductPageOut] = []

    class Config:
        from_attributes = True


class CrawlJobCreate(BaseModel):
    url: str
    workspaceId: str


class CrawlJobOut(BaseModel):
    id: str
    url: str
    status: str
    leadId: Optional[str] = None
    errorMessage: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime
    # Real-time progress fields
    pagesCrawled: int = 0
    pagesTotal: int = 0
    crawlLogs: Optional[str] = None        # JSON string list of log lines
    technologiesFound: Optional[str] = None  # JSON string list of tech names

    class Config:
        from_attributes = True

