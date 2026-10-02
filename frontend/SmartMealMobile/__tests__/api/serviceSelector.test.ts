/**
 * selectService (docs/fetch-api/part1 §4.9 "mock fallback"): useMockApi=true → mock; false → hàm
 * có trong api gọi API thật, hàm còn lại rơi về mock.
 */

interface SampleService {
  getValue: (id: string) => Promise<string>;
  saveValue: (value: string) => Promise<void>;
}

function loadSelector(useMockApi: boolean) {
  jest.resetModules();
  jest.doMock('@/config/env', () => ({ ENV: { useMockApi } }));
  return (require('@/services/api/serviceSelector') as typeof import('@/services/api/serviceSelector'))
    .selectService;
}

function createMock(): SampleService {
  return {
    getValue: jest.fn(async (id: string) => `mock:${id}`),
    saveValue: jest.fn(async () => undefined),
  };
}

describe('selectService', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test('useMockApi=true → trả đúng object mock, bỏ qua api', async () => {
    const selectService = loadSelector(true);
    const mock = createMock();
    const api: Partial<SampleService> = { getValue: jest.fn(async () => 'api') };

    const service = selectService('sample', mock, api);

    expect(service).toBe(mock);
    expect(await service.getValue('1')).toBe('mock:1');
  });

  test('useMockApi=false → hàm có trong api dùng API, hàm còn lại rơi về mock', async () => {
    const selectService = loadSelector(false);
    const mock = createMock();
    const apiGetValue = jest.fn(async (id: string) => `api:${id}`);

    const service = selectService<SampleService>('sample', mock, { getValue: apiGetValue });

    expect(await service.getValue('7')).toBe('api:7');
    expect(apiGetValue).toHaveBeenCalledWith('7');
    expect(mock.getValue).not.toHaveBeenCalled();

    await service.saveValue('x');
    expect(mock.saveValue).toHaveBeenCalledWith('x');
  });

  test('cảnh báo dev đúng 1 lần cho mỗi hàm rơi về mock', async () => {
    const selectService = loadSelector(false);
    const service = selectService<SampleService>('sample', createMock(), {});

    await service.saveValue('a');
    await service.saveValue('b');
    await service.getValue('1');

    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy.mock.calls[0][0]).toContain('sample.saveValue');
    expect(warnSpy.mock.calls[1][0]).toContain('sample.getValue');
  });

  test('hàm đã nối API không bị cảnh báo', async () => {
    const selectService = loadSelector(false);
    const service = selectService<SampleService>('sample', createMock(), {
      getValue: async () => 'api',
    });

    await service.getValue('1');

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
