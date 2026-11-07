import { useQuery } from '@tanstack/react-query';
import { FollowUpQuestion, QuestionStatus } from '../types.ts';
import { ApiError, apiRequest } from './client.ts';
import type { components } from './schema';

type QuestionOut = components['schemas']['QuestionOut'];
type QuestionList = components['schemas']['QuestionList'];
type QuestionGenerateOut = components['schemas']['QuestionGenerateOut'];

export const questionsKey = (projectId: string) => ['perguntas', projectId];

const STATUS_LABELS: Record<string, QuestionStatus> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  respondida: 'Respondida',
  rejeitada: 'Rejeitada',
};

const toQuestion = (q: QuestionOut): FollowUpQuestion => ({
  id: String(q.id),
  storyId: String(q.historia_id),
  storyCode: q.historia_codigo ?? '',
  storyTitle: String(q.historia_titulo ?? ''),
  question: q.pergunta,
  note: q.justificativa || q.descricao_defeito,
  status: STATUS_LABELS[q.status] ?? 'Pendente',
  answer: q.resposta ?? null,
});

export const useQuestions = (projectId: string) =>
  useQuery({
    queryKey: questionsKey(projectId),
    queryFn: async () => (await apiRequest<QuestionList>(`/projetos/${projectId}/perguntas`)).itens.map(toQuestion),
  });

export interface GeneratedQuestions {
  total: number;
  limitations: string[];
}

export const generateQuestions = async (storyId: string): Promise<GeneratedQuestions> => {
  const result = await apiRequest<QuestionGenerateOut>(`/historias/${storyId}/perguntas/gerar`, { method: 'POST' });
  return { total: result.total, limitations: result.limitacoes.map((l) => String(l.motivo ?? '')).filter(Boolean) };
};

export const editQuestion = (id: string, text: string) =>
  apiRequest<unknown>(`/perguntas/${id}`, { method: 'PATCH', body: { pergunta: text } });

export const approveQuestion = (id: string) => apiRequest<unknown>(`/perguntas/${id}/aprovar`, { method: 'POST' });

export const answerQuestion = (id: string, answer: string) =>
  apiRequest<unknown>(`/perguntas/${id}/responder`, { method: 'POST', body: { resposta: answer } });

// A rota de exclusão ainda será criada na API; até lá, explica em vez de mostrar o erro técnico.
export const deleteQuestion = async (id: string): Promise<void> => {
  try {
    await apiRequest<void>(`/perguntas/${id}`, { method: 'DELETE' });
  } catch (error) {
    if (error instanceof ApiError && error.status === 405) {
      throw new ApiError(405, error.codigo, 'Descartar perguntas ainda não está disponível na API.');
    }
    throw error;
  }
};
