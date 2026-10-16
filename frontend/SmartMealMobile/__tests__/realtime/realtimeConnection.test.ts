/**
 * openRealtimeConnection: mở WebSocket SignalR tới backend, báo onConnected mỗi lần kết nối xong, tự thử lại khi kết nối
 * lỗi/rớt, kết nối lại ngay khi app quay về foreground, và dừng hẳn khi đóng.
 */
import { AppState, type AppStateStatus } from 'react-native';

type Handler = (payload: unknown) => void;

interface FakeConnection {
  state: string;
  handlers: Map<string, Handler>;
  closeHandler: (() => void) | undefined;
  start: jest.Mock<Promise<void>, []>;
  stop: jest.Mock<Promise<void>, []>;
  on: jest.Mock<void, [string, Handler]>;
  onclose: jest.Mock<void, [() => void]>;
}

const mockConnection: FakeConnection = {
  state: 'Disconnected',
  handlers: new Map<string, Handler>(),
  closeHandler: undefined,
  start: jest.fn<Promise<void>, []>(),
  stop: jest.fn<Promise<void>, []>(),
  on: jest.fn((event: string, handler: Handler) => {
    mockConnection.handlers.set(event, handler);
  }),
  onclose: jest.fn((handler: () => void) => {
    mockConnection.closeHandler = handler;
  }),
};
const mockWithUrl = jest.fn();

jest.mock('@microsoft/signalr', () => {
  const builder = {
    withUrl: (...args: unknown[]) => {
      mockWithUrl(...args);
      return builder;
    },
    configureLogging: () => builder,
    build: () => mockConnection,
  };
  return {
    HubConnectionBuilder: jest.fn(() => builder),
    HubConnectionState: { Disconnected: 'Disconnected', Connected: 'Connected' },
    HttpTransportType: { WebSockets: 1 },
    LogLevel: { None: 6 },
  };
});
jest.mock('@/config/api', () => ({ API_CONFIG: { baseURL: 'http://10.0.0.2:5000/api' } }));
jest.mock('@/services/api', () => ({ getAccessTokenForRealtime: jest.fn() }));

let appStateListener: ((state: AppStateStatus) => void) | undefined;
const removeAppStateListener = jest.fn();

function load() {
  const { openRealtimeConnection } =
    require('@/services/realtime/realtimeConnection') as typeof import('@/services/realtime/realtimeConnection');
  return openRealtimeConnection;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockConnection.state = 'Disconnected';
  mockConnection.handlers.clear();
  mockConnection.start.mockImplementation(async () => {
    mockConnection.state = 'Connected';
  });
  mockConnection.stop.mockImplementation(async () => {
    mockConnection.state = 'Disconnected';
  });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener as (state: AppStateStatus) => void;
    return { remove: removeAppStateListener };
  });
});

afterEach(() => {
  jest.useRealTimers();
});

test('kết nối WebSocket tới hub dưới base URL API, gắn handler và báo đã kết nối', async () => {
  const onNotification = jest.fn();
  const onConnected = jest.fn();

  const stop = load()({ path: '/hubs/notifications', handlers: { notification: onNotification }, onConnected });
  await jest.advanceTimersByTimeAsync(0);

  expect(mockWithUrl).toHaveBeenCalledWith(
    'http://10.0.0.2:5000/api/hubs/notifications',
    expect.objectContaining({ transport: 1, skipNegotiation: true }),
  );
  expect(onConnected).toHaveBeenCalledTimes(1);
  mockConnection.handlers.get('notification')?.({ id: 'n-1' });
  expect(onNotification).toHaveBeenCalledWith({ id: 'n-1' });
  stop();
});

test('kết nối lỗi (server chưa chạy) → thử lại sau 1s, 2s… tới khi được', async () => {
  mockConnection.start
    .mockRejectedValueOnce(new Error('down'))
    .mockRejectedValueOnce(new Error('down'))
    .mockImplementation(async () => {
      mockConnection.state = 'Connected';
    });
  const onConnected = jest.fn();

  const stop = load()({ path: '/hubs/notifications', handlers: {}, onConnected });
  await jest.advanceTimersByTimeAsync(0);
  expect(mockConnection.start).toHaveBeenCalledTimes(1);

  await jest.advanceTimersByTimeAsync(1_000);
  expect(mockConnection.start).toHaveBeenCalledTimes(2);
  expect(onConnected).not.toHaveBeenCalled();

  await jest.advanceTimersByTimeAsync(2_000);
  expect(mockConnection.start).toHaveBeenCalledTimes(3);
  expect(onConnected).toHaveBeenCalledTimes(1);
  stop();
});

test('rớt kết nối → tự kết nối lại và báo onConnected để lấy bù dữ liệu', async () => {
  const onConnected = jest.fn();
  const stop = load()({ path: '/hubs/notifications', handlers: {}, onConnected });
  await jest.advanceTimersByTimeAsync(0);

  mockConnection.state = 'Disconnected';
  mockConnection.closeHandler?.();
  await jest.advanceTimersByTimeAsync(1_000);

  expect(mockConnection.start).toHaveBeenCalledTimes(2);
  expect(onConnected).toHaveBeenCalledTimes(2);
  stop();
});

test('quay lại app khi đang mất kết nối → kết nối lại ngay, không đợi lượt thử kế tiếp', async () => {
  mockConnection.start.mockRejectedValueOnce(new Error('offline'));
  const stop = load()({ path: '/hubs/notifications', handlers: {} });
  await jest.advanceTimersByTimeAsync(0);
  expect(mockConnection.start).toHaveBeenCalledTimes(1);

  appStateListener?.('active');
  await jest.advanceTimersByTimeAsync(0);

  expect(mockConnection.start).toHaveBeenCalledTimes(2);
  expect(mockConnection.state).toBe('Connected');
  stop();
});

test('đóng (đăng xuất) → ngắt kết nối, bỏ nghe AppState và không thử lại nữa', async () => {
  const stop = load()({ path: '/hubs/notifications', handlers: {} });
  await jest.advanceTimersByTimeAsync(0);

  stop();
  await jest.advanceTimersByTimeAsync(0);
  mockConnection.closeHandler?.();
  await jest.advanceTimersByTimeAsync(60_000);

  expect(mockConnection.stop).toHaveBeenCalled();
  expect(removeAppStateListener).toHaveBeenCalled();
  expect(mockConnection.start).toHaveBeenCalledTimes(1);
});
