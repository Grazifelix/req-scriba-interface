import { apiRequest } from './client.ts';

interface HealthResponse {
  status: string;
  componentes: Record<string, { status: string }>;
}

export const COMPONENT_LABELS: Record<string, string> = {
  banco_relacional: 'Banco de dados',
  banco_vetorial: 'Índice vetorial',
  llm: 'Modelo de IA',
  embeddings: 'Embeddings',
  transcricao: 'Transcrição',
};

export const getHealth = (): Promise<HealthResponse> => apiRequest<HealthResponse>('/health');
