import { ENDPOINTS, api } from '@/services/api';
import type { MetaItem } from '../types/health.api.types';
import type { metaMockService } from './metaService.mock';

// /meta/* trả { id, code, name, description }; chuẩn hóa description về null để FE khỏi xử lý undefined.
function toMetaItems(items: MetaItem[]): MetaItem[] {
  return items.map(({ id, code, name, description }) => ({
    id,
    code,
    name,
    description: description ?? null,
  }));
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
