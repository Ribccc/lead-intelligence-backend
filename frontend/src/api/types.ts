export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'EXECUTIVE' | 'MEMBER';
export type LeadStatus = 'DISCOVERED' | 'CRAWLED' | 'ENRICHING' | 'ENRICHED' | 'QUALIFIED' | 'NURTURE' | 'DISQUALIFIED';
export type HiringStatus = 'STABLE' | 'HIGH_VOLUME' | 'EXECUTIVE_SEARCH' | 'NONE';
export type PipelineNodeType = 'SEED_SOURCE' | 'WEB_CRAWLER' | 'AI_QUALIFIER' | 'DATA_CLEANING' | 'DEEP_SCAN' | 'OUTREACH';
export type PipelineNodeStatus = 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type StepType = 'EMAIL' | 'LINKEDIN_CONNECT' | 'LINKEDIN_MESSAGE' | 'WAIT' | 'CONDITION';
export type SyncStatus = 'SUCCESS' | 'SYNCING' | 'FAILED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  logoUrl: string | null;
  createdAt: string;
}

export interface LeadEmail {
  id: string;
  leadId: string;
  email: string;
  sourceUrl: string;
  discoveryPage: string | null;
  crawlTimestamp: string;
  confidenceScore: number;
}

export interface LeadPhone {
  id: string;
  leadId: string;
  phone: string;
  sourceUrl: string;
  discoveryPage: string | null;
  crawlTimestamp: string;
  confidenceScore: number;
}

export interface LeadSocialLink {
  id: string;
  leadId: string;
  socialUrl: string;
  network: string;
  sourceUrl: string;
  discoveryPage: string | null;
  crawlTimestamp: string;
  confidenceScore: number;
  validationStatus?: string;
}

// New typed URL entity interfaces matching backend schema
export interface LeadSocialProfile {
  id: string;
  leadId: string;
  socialUrl: string;
  network: string;
  sourceUrl: string;
  discoveryPage: string | null;
  crawlTimestamp: string;
  confidenceScore: number;
  validationStatus: string;
}

export interface LeadContactPage {
  id: string;
  leadId: string;
  url: string;
  sourceUrl: string;
  discoveryPage: string | null;
  crawlTimestamp: string;
  confidenceScore: number;
}

export interface LeadAboutPage {
  id: string;
  leadId: string;
  url: string;
  sourceUrl: string;
  discoveryPage: string | null;
  crawlTimestamp: string;
  confidenceScore: number;
}

export interface LeadSupportPage {
  id: string;
  leadId: string;
  url: string;
  sourceUrl: string;
  discoveryPage: string | null;
  crawlTimestamp: string;
  confidenceScore: number;
}

export interface LeadCareersPage {
  id: string;
  leadId: string;
  url: string;
  sourceUrl: string;
  discoveryPage: string | null;
  crawlTimestamp: string;
  confidenceScore: number;
}

export interface LeadProductPage {
  id: string;
  leadId: string;
  url: string;
  sourceUrl: string;
  discoveryPage: string | null;
  crawlTimestamp: string;
  confidenceScore: number;
}

export interface Lead {
  id: string;
  workspaceId: string;
  companyName: string;
  sector: string;
  industry: string;
  employees: number;
  funding: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  fullAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  revenueRange?: string | null;
  discoverySource?: string | null;
  hiringStatus: HiringStatus;
  conversionProb: number;
  aiScore: number;
  confidenceScore?: number;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  // Intelligence fields from live crawl
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  technologies?: string | null;    // JSON string — parse as string[]
  jobCount?: number;
  pagesCrawled?: number;
  jobListings?: string | null;
  insights?: AIInsight[];
  intentSignals?: IntentSignal[];
  reasoningPoints?: QualificationReason[];
  emails?: LeadEmail[];
  phones?: LeadPhone[];
  // Legacy merged list (kept for backward compat)
  socialLinks?: LeadSocialLink[];
  // New typed URL entities from backend
  socialProfiles?: LeadSocialProfile[];
  contactPages?: LeadContactPage[];
  aboutPages?: LeadAboutPage[];
  supportPages?: LeadSupportPage[];
  careersPages?: LeadCareersPage[];
  productPages?: LeadProductPage[];
}

export interface IntentSignal {
  id: string;
  leadId: string;
  signalType: string;
  volume: number;
  intensity: 'High' | 'Medium' | 'Low';
  detectedAt: string;
}

export interface AIInsight {
  id: string;
  leadId: string;
  summary: string;
  sourceType: string;
  createdAt: string;
}

export interface QualificationReason {
  id: string;
  leadId: string;
  description: string;
  passed: boolean;
  checkedAt: string;
}

export interface Pipeline {
  id: string;
  workspaceId: string;
  name: string;
  isActive: boolean;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  createdAt: string;
}

export interface PipelineNode {
  id: string;
  pipelineId: string;
  type: PipelineNodeType;
  name: string;
  config: any; // JSON Config object
  status: PipelineNodeStatus;
  throughput: number;
  processed: number;
  x: number;
  y: number;
}

export interface PipelineEdge {
  id: string;
  source: string; // sourceNodeId
  target: string; // targetNodeId
}

export interface Campaign {
  id: string;
  workspaceId: string;
  name: string;
  totalOutreach: number;
  openRate: number;
  replyRate: number;
  bounceRate: number;
  spamRisk: string;
  creditsUsed: number;
  creditsTotal: number;
  isActive: boolean;
  stepsCount?: number;
  createdAt: string;
}

export interface CampaignStep {
  id: string;
  campaignId: string;
  stepIndex: number;
  type: StepType;
  name: string;
  config: any; // Step templates, subject, timing rules
}

export interface CampaignLead {
  leadId: string;
  companyName: string;
  currentStep: number;
  lastStatus: string;
  updatedAt: string;
}

export interface Integration {
  id: string;
  workspaceId: string;
  provider: string;
  isActive: boolean;
  syncStatus: SyncStatus;
  recordsSynced: number;
  lastSyncedAt: string | null;
}

export interface ActivityFeedItem {
  id: string;
  type: 'LEAD_ALERT' | 'AI_INSIGHT' | 'SYSTEM';
  title: string;
  description: string;
  score?: number;
  meta?: any;
  createdAt: string;
}

export interface KPIs {
  revenuePipeline: number;
  qualifiedLeads: number;
  activeCampaigns: number;
  aiAccuracy: number;
  avgVelocityLpm: number;
}

export interface ChartCoordinate {
  label: string;
  leadGrowth: number;
  aiQualified: number;
}

export interface OutreachDraft {
  leadId: string;
  companyName: string;
  subject: string;
  emailDraft: string;
  confidence: number;
  modelUsed: string;
  signalsSynthesizedCount: number;
}

export interface CrawlJob {
  id: string;
  url: string;
  status: 'queued' | 'crawling' | 'completed' | 'failed';
  leadId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  // Real-time progress fields
  pagesCrawled?: number;
  pagesTotal?: number;
  crawlLogs?: string | null;           // JSON string — parse as string[]
  technologiesFound?: string | null;   // JSON string — parse as string[]
}

