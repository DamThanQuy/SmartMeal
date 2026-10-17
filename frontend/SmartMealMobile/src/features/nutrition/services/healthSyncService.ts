import { healthSyncApiService } from './healthSyncService.api';

// Calo vận động được nhiều nơi cần (Diary, Dashboard, CalorieBudget, Planner) nên service này nằm
// ở feature nutrition (nơi tính ngân sách calo) để không tạo vòng phụ thuộc giữa các feature.
export const healthSyncService = healthSyncApiService;
