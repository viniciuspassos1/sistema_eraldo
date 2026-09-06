import type { Holiday } from '../types';
import { apiRequest } from './client';

export class FeriadosApiError extends Error {}

export function fetchFeriados(): Promise<Holiday[]> {
  return apiRequest('/api/feriados', FeriadosApiError);
}
