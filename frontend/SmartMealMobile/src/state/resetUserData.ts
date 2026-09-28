// BR-271 — "Xóa dữ liệu cá nhân" (DeleteDataScreen) phải thực sự xóa dữ liệu mock của user hiện
// tại. Mỗi store/service nắm dữ liệu người dùng (nhật ký, hồ sơ sức khỏe, yêu thích, meal plan,
// grocery, gamification, AI usage...) tự đăng ký hàm reset về đây lúc module load — DeleteDataScreen
// chỉ cần gọi resetUserData() một lần, không cần biết danh sách store cụ thể.
//
// KHÔNG đăng ký: authStore, appStore (theme/ngôn ngữ), premiumStore và lịch sử giao dịch — dữ liệu
// thanh toán được giữ lại theo đúng BR-271 (xem DeleteDataScreen.tsx, ITEMS_TO_KEEP).
type ResetFn = () => void;

const registry = new Map<string, ResetFn>();

export function registerUserDataReset(name: string, fn: ResetFn): void {
  registry.set(name, fn);
}

export function resetUserData(): void {
  registry.forEach(fn => fn());
}
