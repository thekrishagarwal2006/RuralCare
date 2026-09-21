export class WebSocketClient {
  private socket: WebSocket | null = null;
  private url: string;
  private onMessageCallback: (data: any) => void;
  private onStatusChangeCallback?: (isConnected: boolean) => void;
  private reconnectInterval: number = 1000;
  private maxReconnectInterval: number = 10000;
  private shouldReconnect: boolean = true;
  private reconnectTimer: any = null;

  constructor(
    endpoint: string,
    onMessage: (data: any) => void,
    onStatusChange?: (isConnected: boolean) => void
  ) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1';
    
    // Automatically derive WebSocket base URL (e.g., https://... -> wss://...)
    let wsBase = apiUrl
      .replace(/^http:/, 'ws:')
      .replace(/^https:/, 'wss:')
      .replace(/\/api\/v1\/?$/, '');

    this.url = `${wsBase}${endpoint}`;
    this.onMessageCallback = onMessage;
    this.onStatusChangeCallback = onStatusChange;
  }

  connect() {
    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        console.log(`[WebSocket] Connected to ${this.url}`);
        this.reconnectInterval = 1000; // Reset exponential backoff on successful connect
        if (this.onStatusChangeCallback) {
          this.onStatusChangeCallback(true);
        }
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
        if (this.onStatusChangeCallback) {
          this.onStatusChangeCallback(false);
        }

        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (err) => {
        console.error('[WebSocket] Error:', err);
        this.socket?.close();
      };
    } catch (e) {
      console.error('[WebSocket] Connection failed:', e);
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback(false);
      }
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    
    console.log(`[WebSocket] Scheduling reconnect in ${this.reconnectInterval}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);

    // Exponential backoff up to max threshold
    this.reconnectInterval = Math.min(this.reconnectInterval * 2, this.maxReconnectInterval);
  }

  close() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
    }
  }
}
