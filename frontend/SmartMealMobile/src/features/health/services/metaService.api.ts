import { ENDPOINTS, api } from '@/services/api';
import type { MetaItem } from '../types/health.api.types';
import type { metaMockService } from './metaService.mock';

// /meta/* trả thẳng entity EF — bỏ các mảng điều hướng rỗng (userAllergies, recipeTags…), chỉ giữ
// phần FE dùng.
function toMetaItems(items: MetaItem[]): MetaItem[] {
  return items.map(({ id, name, description }) => ({ id, name, description: description ?? null }));
}

export const metaApiService: Partial<typeof metaMockService> = {
  async getAllergies() {
    return toMetaItems(await api.get<MetaItem[]>(ENDPOINTS.meta.allergies));
  },
  async getMedicalConditions() {
    return toMetaItems(await api.get<MetaItem[]>(ENDPOINTS.meta.medicalConditions));
  },
  async getTags() {
    return toMetaItems(await api.get<MetaItem[]>(ENDPOINTS.meta.tags));
  },
};
