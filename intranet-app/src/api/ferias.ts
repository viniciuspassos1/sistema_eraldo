import type { Vacation } from '../types';
import { apiRequest } from './client';

export class FeriasApiError extends Error {}

export function fetchFerias(): Promise<Vacation[]> {
  return apiRequest('/api/ferias', FeriasApiError);
}
