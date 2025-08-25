export class SSEClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, (data: any) => void> = new Map();

  connect(url: string) {
    this.disconnect();
    this.eventSource = new EventSource(url);
    
    this.eventSource.onopen = () => {
      console.log('SSE connection opened');
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.listeners.forEach(callback => callback(data));
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      this.disconnect();
    };
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  subscribe(id: string, callback: (data: any) => void) {
    this.listeners.set(id, callback);
    return () => {
      this.listeners.delete(id);
    };
  }

  isConnected() {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

export const sseClient = new SSEClient();
