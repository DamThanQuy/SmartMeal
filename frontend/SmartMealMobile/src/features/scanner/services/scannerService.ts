import { selectService } from '@/services/api';
import { scannerApiService } from './scannerService.api';
import { CameraPermissionDeniedError, scannerMockService } from './scannerService.mock';

export { CameraPermissionDeniedError };

export const scannerService = selectService(
  'scannerService',
  scannerMockService,
  scannerApiService,
);
