import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

// react-query báo kết quả cho component qua setTimeout(0) — xả vài vòng để hook render lại.
async function flushTimers(): Promise<void> {
  for (let round = 0; round < 3; round += 1) {
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
}

// Tiện ích test: render 1 hook bên trong QueryClientProvider (không retry) để kiểm tra hook
// useQuery/useMutation mà không cần màn hình. Đặt ngoài __tests__ để Jest không coi là file test.
export async function renderHookWithQuery<T>(useHook: () => T) {
  const queryClient = new QueryClient({
    // gcTime vô hạn: react-query không đặt timer dọn cache nên Jest không bị treo vì handle mở.
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  const result: { current: T | undefined } = { current: undefined };

  function Probe() {
    const value = useHook();
    React.useEffect(() => {
      result.current = value;
    });
    return null;
  }

  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={queryClient}>
        <Probe />
      </QueryClientProvider>,
    );
    await flushTimers();
  });

  return {
    queryClient,
    /** Giá trị hook trả về ở lần render gần nhất. */
    get current(): T {
      if (result.current === undefined) throw new Error('Hook chưa render xong');
      return result.current;
    },
    /** Chạy một thao tác (vd. mutateAsync) trong act, xả thông báo của react-query; lỗi được ném lại. */
    async run<R>(action: () => Promise<R>): Promise<R> {
      let outcome: { ok: true; value: R } | { ok: false; error: unknown } | undefined;
      await ReactTestRenderer.act(async () => {
        try {
          outcome = { ok: true, value: await action() };
        } catch (error) {
          outcome = { ok: false, error };
        }
        await flushTimers();
      });
      if (!outcome) throw new Error('Thao tác chưa chạy xong');
      if (!outcome.ok) throw outcome.error;
      return outcome.value;
    },
    /** Chờ react-query xử lý xong (vd. useQuery nhận dữ liệu) và hook render lại. */
    async flush(): Promise<void> {
      await ReactTestRenderer.act(async () => {
        await flushTimers();
      });
    },
    async unmount(): Promise<void> {
      await ReactTestRenderer.act(async () => {
        renderer?.unmount();
      });
      queryClient.clear();
    },
  };
}
