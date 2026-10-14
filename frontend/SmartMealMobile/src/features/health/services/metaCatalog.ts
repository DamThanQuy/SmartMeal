import { createMetaLookup, type MetaCatalog } from './metaLookup';
import { metaService } from './metaService';

// Tải danh mục /meta/* (dị ứng, bệnh lý, chế độ ăn) một lần cho cả phiên chạy app rồi dựng bảng
// ánh xạ theo code (xem metaLookup.ts). Danh mục seed cố định ở BE nên cache bộ nhớ là đủ.

let cached: Promise<MetaCatalog> | null = null;

async function loadCatalog(): Promise<MetaCatalog> {
  const [allergies, conditions, tags] = await Promise.all([
    metaService.getAllergies(),
    metaService.getMedicalConditions(),
    metaService.getTags(),
  ]);
  return {
    allergies: createMetaLookup(allergies),
    conditions: createMetaLookup(conditions),
    tags: createMetaLookup(tags),
  };
}

/** Danh mục đã nạp; lỗi mạng thì lần gọi sau thử lại thay vì giữ lỗi mãi. */
export function getMetaCatalog(): Promise<MetaCatalog> {
  cached ??= loadCatalog().catch(error => {
    cached = null;
    throw error;
  });
  return cached;
}

/** Xóa cache — dùng trong test. */
export function resetMetaCatalog(): void {
  cached = null;
}
