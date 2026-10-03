import { selectService } from '@/services/api';
import { metaApiService } from './metaService.api';
import { metaMockService } from './metaService.mock';

export const metaService = selectService('metaService', metaMockService, metaApiService);
