export interface RealtimeTelemetry {
  avgVelocityLpm: number;
  activeEnginesCount: number;
  throughputDelta: number;
  recentLeadsProcessed: number;
}

export interface CrawlLogEvent {
  type: 'CRAWL_LOG';
  jobId: string;
  message: string;
  pagesCrawled: number;
  pagesTotal: number;
  timestamp: string;
}

export interface CrawlStartedEvent {
  type: 'CRAWL_STARTED';
  jobId: string;
  url: string;
  message: string;
  timestamp: string;
}

export interface CrawlCompleteEvent {
  type: 'CRAWL_COMPLETE';
  jobId: string;
  leadId: string;
  companyName: string;
  aiScore: number;
  pagesCrawled: number;
  technologies: string[];
  emailsFound: number;
  phonesFound: number;
  socialsFound: number;
  message: string;
  timestamp: string;
}

export interface CrawlErrorEvent {
  type: 'CRAWL_ERROR';
  jobId: string;
  url: string;
  error: string;
  message: string;
  timestamp: string;
}

export interface LeadQualifiedEvent {
  type: 'LEAD_QUALIFIED';
  leadId: string;
  companyName: string;
  aiScore: number;
  message: string;
  timestamp: string;
}

export type WsEvent =
  | CrawlLogEvent
  | CrawlStartedEvent
  | CrawlCompleteEvent
  | CrawlErrorEvent
  | LeadQualifiedEvent
  | { type: 'CONNECTED' | 'HEARTBEAT'; message: string; timestamp: string };

type CrawlLogCallback = (event: CrawlLogEvent) => void;
type CrawlCompleteCallback = (event: CrawlCompleteEvent) => void;
type CrawlErrorCallback = (event: CrawlErrorEvent) => void;
type LeadQualifiedCallback = (event: LeadQualifiedEvent) => void;
type GenericEventCallback = (event: WsEvent) => void;

export class SocketService {
  private static mockIntervalId: any = null;
  private static wsInstance: WebSocket | null = null;

  // Crawl event subscribers (filtered by jobId)
  private static crawlLogListeners: Map<string, CrawlLogCallback[]> = new Map();
  private static crawlCompleteListeners: Map<string, CrawlCompleteCallback[]> = new Map();
  private static crawlErrorListeners: Map<string, CrawlErrorCallback[]> = new Map();
  private static leadQualifiedListeners: LeadQualifiedCallback[] = [];
  private static genericListeners: GenericEventCallback[] = [];

  static connectTelemetry(
    workspaceId: string,
    onData: (data: RealtimeTelemetry) => void,
    _useWebSocket: boolean = true
  ): void {
    if (this.wsInstance && this.wsInstance.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const wsUrl = `ws://localhost:5000/telemetry?workspaceId=${workspaceId}`;
    try {
      this.wsInstance = new WebSocket(wsUrl);

      this.wsInstance.onopen = () => {
        console.log('[WS] Connected to telemetry stream.');
      };

      this.wsInstance.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WsEvent;
          this._dispatchEvent(data);
        } catch (e) {
          console.error('[WS] Error parsing event:', e);
        }
      };

      this.wsInstance.onerror = (e) => {
        console.warn('[WS] WebSocket error — falling back to local simulation.', e);
        this.startSimulation(onData);
      };

      this.wsInstance.onclose = () => {
        console.log('[WS] Connection closed.');
      };
    } catch (err) {
      console.warn('[WS] Could not connect WebSocket — falling back to simulation.', err);
      this.startSimulation(onData);
    }
  }

  static disconnectTelemetry(): void {
    if (this.mockIntervalId) {
      clearInterval(this.mockIntervalId);
      this.mockIntervalId = null;
    }
    if (this.wsInstance) {
      this.wsInstance.close();
      this.wsInstance = null;
    }
    // Clear all listeners
    this.crawlLogListeners.clear();
    this.crawlCompleteListeners.clear();
    this.crawlErrorListeners.clear();
    this.leadQualifiedListeners = [];
    this.genericListeners = [];
    console.log('[WS] Telemetry connection disconnected.');
  }

  // ── Crawl-specific subscriptions ────────────────────────────────────────────

  /** Subscribe to real-time log lines for a specific crawl job. Returns unsubscribe fn. */
  static onCrawlLog(jobId: string, callback: CrawlLogCallback): () => void {
    if (!this.crawlLogListeners.has(jobId)) {
      this.crawlLogListeners.set(jobId, []);
    }
    this.crawlLogListeners.get(jobId)!.push(callback);
    return () => {
      const list = this.crawlLogListeners.get(jobId) || [];
      this.crawlLogListeners.set(jobId, list.filter(c => c !== callback));
    };
  }

  /** Subscribe to crawl completion event for a specific job. Returns unsubscribe fn. */
  static onCrawlComplete(jobId: string, callback: CrawlCompleteCallback): () => void {
    if (!this.crawlCompleteListeners.has(jobId)) {
      this.crawlCompleteListeners.set(jobId, []);
    }
    this.crawlCompleteListeners.get(jobId)!.push(callback);
    return () => {
      const list = this.crawlCompleteListeners.get(jobId) || [];
      this.crawlCompleteListeners.set(jobId, list.filter(c => c !== callback));
    };
  }

  /** Subscribe to crawl error event for a specific job. Returns unsubscribe fn. */
  static onCrawlError(jobId: string, callback: CrawlErrorCallback): () => void {
    if (!this.crawlErrorListeners.has(jobId)) {
      this.crawlErrorListeners.set(jobId, []);
    }
    this.crawlErrorListeners.get(jobId)!.push(callback);
    return () => {
      const list = this.crawlErrorListeners.get(jobId) || [];
      this.crawlErrorListeners.set(jobId, list.filter(c => c !== callback));
    };
  }

  /** Subscribe to any lead qualified event. Returns unsubscribe fn. */
  static onLeadQualified(callback: LeadQualifiedCallback): () => void {
    this.leadQualifiedListeners.push(callback);
    return () => {
      this.leadQualifiedListeners = this.leadQualifiedListeners.filter(c => c !== callback);
    };
  }

  /** Subscribe to all events. */
  static onAnyEvent(callback: GenericEventCallback): () => void {
    this.genericListeners.push(callback);
    return () => {
      this.genericListeners = this.genericListeners.filter(c => c !== callback);
    };
  }

  // ── Internal dispatcher ──────────────────────────────────────────────────────

  private static _dispatchEvent(event: WsEvent): void {
    // Notify generic listeners
    this.genericListeners.forEach(cb => cb(event));

    switch (event.type) {
      case 'CRAWL_LOG': {
        const e = event as CrawlLogEvent;
        const listeners = this.crawlLogListeners.get(e.jobId) || [];
        listeners.forEach(cb => cb(e));
        break;
      }
      case 'CRAWL_COMPLETE': {
        const e = event as CrawlCompleteEvent;
        const listeners = this.crawlCompleteListeners.get(e.jobId) || [];
        listeners.forEach(cb => cb(e));
        break;
      }
      case 'CRAWL_ERROR': {
        const e = event as CrawlErrorEvent;
        const listeners = this.crawlErrorListeners.get(e.jobId) || [];
        listeners.forEach(cb => cb(e));
        break;
      }
      case 'LEAD_QUALIFIED': {
        const e = event as LeadQualifiedEvent;
        this.leadQualifiedListeners.forEach(cb => cb(e));
        break;
      }
    }
  }

  private static startSimulation(onData: (data: RealtimeTelemetry) => void) {
    if (this.mockIntervalId) return;

    let baseVelocity = 142.0;

    this.mockIntervalId = setInterval(() => {
      const jitter = (Math.random() - 0.5) * 8.0;
      const avgVelocityLpm = Math.max(100, Math.round((baseVelocity + jitter) * 10) / 10);
      const activeEnginesCount = Math.random() > 0.85 ? Math.floor(Math.random() * 2) + 3 : 4;
      const throughputDelta = Math.round((Math.random() * 5 + 10) * 10) / 10;
      const recentLeadsProcessed = Math.floor(Math.random() * 4);

      onData({
        avgVelocityLpm,
        activeEnginesCount,
        throughputDelta,
        recentLeadsProcessed,
      });
    }, 2500);
  }
}
