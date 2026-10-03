import { createMetaLookup, type MetaCatalog } from '@/features/health/services/metaLookup';
import { metaMockService } from '@/features/health/services/metaService.mock';

/**
 * Danh mục /meta/* theo code dựng từ dữ liệu seed của bản mock (khớp backend). Dùng cho test cần
 * ánh xạ slug FE ↔ id BE mà không gọi mạng. Đặt ngoài __tests__ để Jest không coi là file test.
 */
export async function createTestCatalog(): Promise<MetaCatalog> {
  const [allergies, conditions, tags] = await Promise.all([
    metaMockService.getAllergies(),
    metaMockService.getMedicalConditions(),
    metaMockService.getTags(),
  ]);
  return {
    allergies: createMetaLookup(allergies),
    conditions: createMetaLookup(conditions),
    tags: createMetaLookup(tags),
  };
}
