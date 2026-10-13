/**
 * Live: quét mã vạch với backend thật — mã lạ trả null (không bịa sản phẩm), món người dùng tự nhập kèm
 * mã vạch được tìm thấy ở lần quét sau, dinh dưỡng /100 g và cảnh báo ngưỡng đến từ server (BR-120,
 * BR-140; review PR #9 S1). Chỉ chạy khi có LIVE_API_URL (xem test-utils/live.ts).
 */
import { describeLive, installLiveBackend, uniqueEmail } from '../../test-utils/live';

type AuthModule = typeof import('@/features/auth/services/authService');
type HealthModule = typeof import('@/features/health/services/healthProfileService');
type HealthTypesModule = typeof import('@/features/health/types/health.types');
type NutritionModule = typeof import('@/features/nutrition/services/nutritionService');
type ScannerModule = typeof import('@/features/scanner/services/scannerService');
type AuthStoreModule = typeof import('@/state/auth/authStore');

/** EAN-13 ngẫu nhiên theo thời gian để mỗi lần chạy không đụng mã đã tạo. */
function uniqueBarcode(): string {
  return `89${Date.now().toString().slice(-11)}`;
}

describeLive('quét mã vạch (backend thật)', () => {
  let authService: AuthModule['authService'];
  let healthProfileService: HealthModule['healthProfileService'];
  let healthTypes: HealthTypesModule;
  let nutritionService: NutritionModule['nutritionService'];
  let scannerService: ScannerModule['scannerService'];
  let useAuthStore: AuthStoreModule['useAuthStore'];

  beforeAll(async () => {
    installLiveBackend();
    ({ authService } = require('@/features/auth/services/authService') as AuthModule);
    ({ healthProfileService } = require('@/features/health/services/healthProfileService') as HealthModule);
    healthTypes = require('@/features/health/types/health.types') as HealthTypesModule;
    ({ nutritionService } = require('@/features/nutrition/services/nutritionService') as NutritionModule);
    ({ scannerService } = require('@/features/scanner/services/scannerService') as ScannerModule);
    ({ useAuthStore } = require('@/state/auth/authStore') as AuthStoreModule);

    const { user } = await authService.register({ fullName: 'Người Quét', email: uniqueEmail('scanner'), password: 'Passw0rd!' });
    useAuthStore.setState({ pendingUser: user, user: null, isAuthenticated: false });
    await healthProfileService.submitHealthProfile({
      ...healthTypes.createEmptyHealthProfileFormData(),
      dateOfBirth: { day: '15', month: '6', year: '1995' },
      gender: 'female',
      heightCm: '160',
      weightKg: '55',
      goal: 'maintain',
      activityLevel: 'light',
    });
    useAuthStore.setState({ pendingUser: null, user, isAuthenticated: true });
  }, 30_000);

  test('mã vạch không có trong CSDL → null để màn chuyển sang "Không tìm thấy sản phẩm"', async () => {
    await expect(scannerService.scanBarcode(uniqueBarcode())).resolves.toBeNull();
  });

  test('món tự nhập kèm mã vạch → lần quét sau tìm thấy, dinh dưỡng /100 g và cảnh báo đường cao', async () => {
    const barcode = uniqueBarcode();
    await nutritionService.createFood({
      name: 'Bánh quy thử nghiệm',
      amount: 50,
      unit: 'g',
      nutrition: { calories: 250, proteinG: 3, carbsG: 30, fatG: 12, sugarG: 15, sodiumMg: 100 },
      barcode,
    });

    const product = await scannerService.scanBarcode(barcode);

    expect(product).not.toBeNull();
    expect(product?.name).toBe('Bánh quy thử nghiệm');
    expect(product?.barcode).toBe(barcode);
    expect(product?.isVerified).toBe(false);
    // 50 g → quy về 100 g phía FE khi tạo món; server trả lại đúng số /100 g.
    expect(product?.nutritionPer100g).toMatchObject({ calories: 500, sugarG: 30, fatG: 24 });
    // 30 g đường /100 g vượt ngưỡng "cao" → server gắn cảnh báo, không còn ngưỡng cứng phía FE.
    expect(product?.alerts.length).toBeGreaterThan(0);
    expect(product?.alerts.some(alert => alert.severity !== 'info')).toBe(true);
  });
});
