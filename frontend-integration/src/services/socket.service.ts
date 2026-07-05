export interface RealtimeTelemetry {
  avgVelocityLpm: number;
  activeEnginesCount: number;
  throughputDelta: number;
  recentLeadsProcessed: number;
}

export class SocketService {
  private static mockIntervalId: any = null;
  private static wsInstance: WebSocket | null = null;

  /**
   * Establishes real-time connection telemetry. 
   * Provides fallback mock-intervals to simulate live charts in preview environments.
   */
  static connectTelemetry(
    workspaceId: string,
    onData: (data: RealtimeTelemetry) => void,
    useWebSocket: boolean = false
  ): void {
    if (useWebSocket) {
      // Connect to standard server WebSocket endpoint
      const wsUrl = `ws://localhost:5000/telemetry?workspaceId=${workspaceId}`;
      try {
        this.wsInstance = new WebSocket(wsUrl);
        this.wsInstance.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            onData(data);
          } catch (e) {
            console.error('Error parsing live socket stream:', e);
          }
        };
        this.wsInstance.onerror = (e) => {
          console.warn('WebSocket error encountered. Falling back to local simulation metrics.', e);
          this.startSimulation(onData);
        };
      } catch (err) {
        console.warn('Could not launch WebSocket connection. Falling back to local simulation metrics.', err);
        this.startSimulation(onData);
      }
    } else {
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
    console.log('Telemetry connection disconnected.');
  }

  private static startSimulation(onData: (data: RealtimeTelemetry) => void) {
    if (this.mockIntervalId) return;

    let baseVelocity = 142.0;
    
    // Simulate natural live jitter to animate UI graphs beautifully
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
