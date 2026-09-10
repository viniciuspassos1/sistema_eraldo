import { apiFetch, apiRequest } from './client';

export interface Backup {
  id: string;
  tipo: 'AUTOMATICO' | 'MANUAL';
  status: 'EM_ANDAMENTO' | 'SUCESSO' | 'FALHA';
  iniciadoEm: string;
  finalizadoEm?: string;
  arquivoNome?: string;
  tamanhoBytes?: number;
  erro?: string;
}

export class BackupsApiError extends Error {}

export function fetchBackups(): Promise<Backup[]> {
  return apiRequest('/api/backups', BackupsApiError);
}

export function dispararBackupManual(): Promise<{ status: string }> {
  return apiRequest('/api/backups', BackupsApiError, { method: 'POST' });
}

export async function baixarBackup(backup: Backup): Promise<Blob> {
  const response = await apiFetch(`/api/backups/${backup.id}/arquivo`, BackupsApiError);
  if (!response.ok) {
    throw new BackupsApiError('Não foi possível baixar o arquivo de backup.');
  }
  return response.blob();
}
