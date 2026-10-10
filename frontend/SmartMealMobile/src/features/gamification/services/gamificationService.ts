import { selectService } from '@/services/api';
import { gamificationApiService } from './gamificationService.api';
import { gamificationMockService } from './gamificationService.mock';

export const gamificationService = selectService(
  'gamificationService',
  gamificationMockService,
  gamificationApiService,
);
