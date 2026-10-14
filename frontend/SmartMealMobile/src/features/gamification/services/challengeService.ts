import { selectService } from '@/services/api';
import { challengeApiService } from './challengeService.api';
import { challengeMockService, getCompletedChallengeIds } from './challengeService.mock';

export const challengeService = selectService(
  'challengeService',
  challengeMockService,
  challengeApiService,
);

export { getCompletedChallengeIds };
