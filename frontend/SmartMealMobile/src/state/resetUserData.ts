// BR-271 — đăng xuất / "Xóa dữ liệu cá nhân" (DeleteDataScreen) phải xóa dữ liệu của user hiện tại còn
// giữ ở máy. Mỗi store nắm dữ liệu người dùng (hồ sơ sức khỏe, hàng đợi offline, thực đơn vừa đổi...) tự đăng
// ký hàm reset về đây lúc module load — nơi gọi chỉ cần resetUserData() một lần, không cần biết danh
// sách store cụ thể.
//
// KHÔNG đăng ký: authStore, appStore (theme), premiumStore và lịch sử giao dịch — dữ liệu
// thanh toán được giữ lại theo đúng BR-271 (xem DeleteDataScreen.tsx, ITEMS_TO_KEEP).
type ResetFn = () => void;

const registry = new Map<string, ResetFn>();

export function registerUserDataReset(name: string, fn: ResetFn): void {
  registry.set(name, fn);
}

export function resetUserData(): void {
  registry.forEach(fn => fn());
}
