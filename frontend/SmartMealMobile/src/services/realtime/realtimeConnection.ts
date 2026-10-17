import {
  HttpTransportType,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { AppState } from 'react-native';
import { API_CONFIG } from '@/config/api';
import { getAccessTokenForRealtime } from '@/services/api';

// Kết nối real-time tới backend (SignalR qua WebSocket — thuần JS, chạy được trên Expo Go và web). Server chỉ đẩy sự
// kiện xuống, app không gọi gì lên. Rớt kết nối (mất mạng, server khởi động lại, app bị treo nền) thì tự thử lại;
// quay lại app thì kết nối lại ngay thay vì đợi lượt thử kế tiếp.

/** Thử lại sau 1s, 2s, 5s, 10s rồi mỗi 30s — không bỏ cuộc khi app còn mở. */
const RETRY_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

export interface RealtimeConnectionOptions {
  /** Đường dẫn hub tương đối với base URL API (vd. ENDPOINTS.notifications.hub). */
  path: string;
  /** Sự kiện server → app (tên sự kiện → handler nhận payload chưa kiểm tra kiểu). */
  handlers: Record<string, (payload: unknown) => void>;
  /** Mỗi lần kết nối xong (kể cả lần đầu): lấy bù dữ liệu có thể đã lỡ trong lúc chưa kết nối. */
  onConnected?: () => void;
}

/** Mở kết nối và giữ nó sống tới khi gọi hàm trả về (đăng xuất, unmount). */
export function openRealtimeConnection({
  path,
  handlers,
  onConnected,
}: RealtimeConnectionOptions): () => void {
  const connection = new HubConnectionBuilder()
    .withUrl(`${API_CONFIG.baseURL}${path}`, {
      // Bỏ bước negotiate (HTTP) và đi thẳng WebSocket — token được gửi kèm lúc mở WebSocket.
      transport: HttpTransportType.WebSockets,
      skipNegotiation: true,
      accessTokenFactory: getAccessTokenForRealtime,
    })
    .configureLogging(LogLevel.None)
    .build();

  for (const [event, handler] of Object.entries(handlers)) {
    connection.on(event, handler);
  }

  let stopped = false;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const clearRetry = () => {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
  };

  const scheduleRetry = () => {
    if (stopped || retryTimer) return;
    const delay =
      RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
    attempt += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void start();
    }, delay);
  };

  async function start(): Promise<void> {
    if (stopped || connection.state !== HubConnectionState.Disconnected) return;
    try {
      await connection.start();
      if (stopped) {
        await connection.stop().catch(() => {});
        return;
      }
      attempt = 0;
      onConnected?.();
    } catch {
      scheduleRetry();
    }
  }

  connection.onclose(() => scheduleRetry());

  const appStateSubscription = AppState.addEventListener('change', state => {
    if (
      state !== 'active' ||
      connection.state !== HubConnectionState.Disconnected
    )
      return;
    clearRetry();
    attempt = 0;
    void start();
  });

  void start();

  return () => {
    stopped = true;
    clearRetry();
    appStateSubscription.remove();
    void connection.stop().catch(() => {});
  };
}
