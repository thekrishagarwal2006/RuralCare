export class WebSocketClient {
  private socket: WebSocket | null = null;
  private url: string;
  private onMessageCallback: (data: any) => void;
  private reconnectInterval: number = 3000;
  private shouldReconnect: boolean = true;

  constructor(endpoint: string, onMessage: (data: any) => void) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_WS_HOST || '127.0.0.1:8001';
    this.url = `${wsProtocol}//${host}${endpoint}`;
    this.onMessageCallback = onMessage;
  }

  connect() {
    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        console.log(`[WebSocket] Connected to ${this.url}`);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessageCallback(data);
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      this.socket.onclose = () => {
        console.log(`[WebSocket] Disconnected from ${this.url}`);
        if (this.shouldReconnect) {
          setTimeout(() => this.connect(), this.reconnectInterval);
        }
      };

      this.socket.onerror = (err) => {
        console.error('[WebSocket] Error:', err);
        this.socket?.close();
      };
    } catch (e) {
      console.error('[WebSocket] Connection failed:', e);
    }
  }

  close() {
    this.shouldReconnect = false;
    if (this.socket) {
      this.socket.close();
    }
  }
}
