import type { CourtLink } from '../types';
import { apiRequest } from './client';

export class TribunaisApiError extends Error {}

export function fetchTribunais(): Promise<CourtLink[]> {
  return apiRequest('/api/tribunais', TribunaisApiError);
}
