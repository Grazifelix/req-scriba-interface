import { getUserName } from './identity.ts';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
const API_PREFIX = '/api/v1';

type ErrorDetail = { campo?: string };

export class ApiError extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly detalhes: unknown;

  constructor(status: number, codigo: string, mensagem: string, detalhes: unknown = null) {
    super(mensagem);
    this.name = 'ApiError';
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

const NETWORK_ERROR_MESSAGE =
  `Não foi possível conectar à API em ${API_URL}. ` +
  'Verifique se ela está rodando e se esta origem está liberada em REQSCRIBA_CORS_ORIGINS.';

const toApiError = async (response: Response): Promise<ApiError> => {
  const fallback = `A API respondeu com erro ${response.status}.`;
  try {
    const { erro } = await response.json();
    let message: string = erro?.mensagem || fallback;
    if (erro?.codigo === 'entrada_invalida' && Array.isArray(erro.detalhes)) {
      const fields = (erro.detalhes as ErrorDetail[]).map((d) => d.campo).filter(Boolean);
      if (fields.length > 0) message += ` Campos: ${fields.join(', ')}.`;
    }
    return new ApiError(response.status, erro?.codigo || `http_${response.status}`, message, erro?.detalhes);
  } catch {
    return new ApiError(response.status, `http_${response.status}`, fallback);
  }
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

// Sem timeout próprio: a avaliação QUS e a geração de perguntas rodam o LLM dentro da requisição.
export const apiRequest = async <T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> => {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const userName = getUserName();
  if (method !== 'GET' && userName) headers['X-Usuario'] = userName;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${API_PREFIX}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'sem_conexao', NETWORK_ERROR_MESSAGE);
  }

  if (!response.ok) throw await toApiError(response);
  return (response.status === 204 ? undefined : await response.json()) as T;
};

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
