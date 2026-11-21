import { useQuery } from '@tanstack/react-query';
import { Suggestion } from '../types.ts';
import { apiRequest } from './client.ts';
import type { components } from './schema';
import { toAudioEvidence, toDocumentEvidence } from './stories.ts';

type SuggestionOut = components['schemas']['SuggestionOut'];
type SourceExcerptOut = Parameters<typeof toAudioEvidence>[0];
type SuggestionList = components['schemas']['SuggestionList'];

const FIELD_LABELS: Record<string, string> = {
  titulo: 'Título',
  perfil: 'Perfil',
  funcionalidade: 'Funcionalidade',
  beneficio: 'Benefício',
  historia: 'Texto da história',
  criterios_aceitacao: 'Critérios de aceitação',
};

export const suggestionsKey = (projectId: string) => ['sugestoes', projectId];
export const suggestionKey = (suggestionId: string) => ['sugestao', suggestionId];

const toSuggestion = (s: SuggestionOut): Suggestion => {
  const proposed = s.conteudo_proposto as {
    historia?: string;
    titulo?: string;
    criterios_aceitacao?: Array<{ criterio?: string }>;
  };
  const comparison = s.comparacao as { campos_alterados?: string[] } | null | undefined;
  return {
    id: String(s.id),
    storyId: s.historia_id === null ? null : String(s.historia_id),
    storyCode: (s.historia_codigo as string | null | undefined) ?? null,
    type: s.tipo,
    typeLabel: s.tipo_rotulo,
    justification: s.justificativa,
    proposedText: proposed.historia ?? '',
    proposedTitle: proposed.titulo ?? 'Novo requisito',
    proposedCriteria: (proposed.criterios_aceitacao ?? []).map((c) => c.criterio ?? '').filter(Boolean),
    currentText: ((s.conteudo_atual as { historia?: string } | null)?.historia) ?? null,
    changedFields: (comparison?.campos_alterados ?? []).map((f) => FIELD_LABELS[f] ?? f),
    audioEvidence: (s.fontes_audio ?? []).map((e, i) => toAudioEvidence(e as SourceExcerptOut, i)),
    documentEvidence: (s.fontes_documentos ?? []).map((e, i) => toDocumentEvidence(e as SourceExcerptOut, i)),
  };
};

export const usePendingSuggestions = (projectId: string) =>
  useQuery({
    queryKey: suggestionsKey(projectId),
    queryFn: async () =>
      (await apiRequest<SuggestionList>(`/projetos/${projectId}/sugestoes-atualizacao?status=pendente`)).itens.map(
        toSuggestion
      ),
  });

export const useSuggestion = (suggestionId: string | null) =>
  useQuery({
    queryKey: suggestionKey(suggestionId ?? ''),
    queryFn: async () => toSuggestion(await apiRequest<SuggestionOut>(`/sugestoes-atualizacao/${suggestionId}`)),
    enabled: !!suggestionId,
  });

// Retorna o id da história criada, quando a sugestão é um novo requisito.
export const approveSuggestion = async (suggestionId: string): Promise<string | null> => {
  const applied = await apiRequest<SuggestionOut>(`/sugestoes-atualizacao/${suggestionId}/aprovar`, { method: 'POST' });
  return applied.historia_criada_id ? String(applied.historia_criada_id) : null;
};

export const rejectSuggestion = (suggestionId: string) =>
  apiRequest<unknown>(`/sugestoes-atualizacao/${suggestionId}/rejeitar`, { method: 'POST' });
