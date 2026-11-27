import { useQuery } from '@tanstack/react-query';
import { AffectedCriterion, ImpactConflict, Suggestion } from '../types.ts';
import { ApiError, apiRequest } from './client.ts';
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

export const CATEGORY_LABELS: Record<string, string> = {
  confirmacao: 'Confirmação',
  complementacao: 'Complementação',
  modificacao: 'Modificação',
  contradicao: 'Contradição',
  nova_necessidade: 'Nova necessidade',
  revisao_criterios: 'Revisão de critérios',
  complementa: 'Complementa',
  contradiz: 'Contradiz',
  novo_requisito: 'Novo requisito',
};

const COMPONENT_LABELS: Record<string, string> = { perfil: 'Perfil', funcionalidade: 'Funcionalidade', beneficio: 'Benefício' };

type DetailsOut = {
  categoria_original?: string | null;
  componentes_afetados?: string[];
  criterios_afetados?: Array<{ codigo: string; criterio: string; acao_recomendada: 'REVISAR' | 'MANTER'; origem: string }>;
  conflitos?: Array<{
    descricao: string;
    impacto?: string | null;
    trechos: Array<{ rotulo: string; origem: string; descricao: string; texto: string }>;
  }>;
  alternativa_proposta?: string | null;
  id_temporario?: string | null;
  possiveis_duplicidades?: Array<{ codigo: string; similaridade: number }>;
  criterios_substituidos?: Array<{ criterio: string }>;
  criterios_mantidos?: Array<{ criterio: string }>;
  criterios_novos?: string[];
};

const toConflicts = (d: DetailsOut): ImpactConflict[] =>
  (d.conflitos ?? []).map((c) => ({
    description: c.descricao,
    impact: c.impacto ?? null,
    sources: c.trechos.map((t) => ({ label: t.rotulo, origin: t.origem, description: t.descricao, text: t.texto })),
  }));

const toAffectedCriteria = (d: DetailsOut): AffectedCriterion[] =>
  (d.criterios_afetados ?? []).map((c) => ({
    code: c.codigo,
    criterion: c.criterio,
    action: c.acao_recomendada,
    byModel: c.origem !== 'codigo',
  }));

export const suggestionsKey = (projectId: string) => ['sugestoes', projectId];
export const suggestionKey = (suggestionId: string) => ['sugestao', suggestionId];

const toSuggestion = (s: SuggestionOut): Suggestion => {
  const proposed = s.conteudo_proposto as {
    historia?: string;
    titulo?: string;
    criterios_aceitacao?: Array<{ criterio?: string }>;
  };
  const comparison = s.comparacao as { campos_alterados?: string[] } | null | undefined;
  const details = (s.detalhes ?? {}) as DetailsOut;
  return {
    id: String(s.id),
    isConfirmation: s.tipo === 'confirmacao',
    outdated: Boolean(s.desatualizada),
    baseVersion: s.versao_base ?? null,
    currentVersion: s.versao_atual_historia ?? null,
    reclassifiedFrom: details.categoria_original ? CATEGORY_LABELS[details.categoria_original] ?? details.categoria_original : null,
    affectedComponents: (details.componentes_afetados ?? []).map((c) => COMPONENT_LABELS[c] ?? c),
    affectedCriteria: toAffectedCriteria(details),
    conflicts: toConflicts(details),
    alternativeText: details.alternativa_proposta ?? null,
    temporaryId: details.id_temporario ?? null,
    possibleDuplicates: (details.possiveis_duplicidades ?? []).map((d) => ({ code: d.codigo, similarity: d.similaridade })),
    criteriaReview: s.tipo === 'revisao_criterios'
      ? {
          replaced: (details.criterios_substituidos ?? []).map((c) => c.criterio),
          kept: (details.criterios_mantidos ?? []).map((c) => c.criterio),
          added: details.criterios_novos ?? [],
        }
      : null,
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

type ConfirmationReason = 'proposta_desatualizada' | 'possivel_duplicidade';

const confirmationReason = (error: unknown): ConfirmationReason | null => {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const reason = (error.detalhes as { motivo?: string } | null)?.motivo;
  return reason === 'proposta_desatualizada' || reason === 'possivel_duplicidade' ? reason : null;
};

const CONFIRMATION_QUESTION: Record<ConfirmationReason, (details: Record<string, unknown>) => string> = {
  proposta_desatualizada: (d) =>
    `\n\nAplicar mesmo assim só os campos que a proposta altera (${((d.campos_propostos as string[]) ?? [])
      .map((f) => FIELD_LABELS[f] ?? f)
      .join(', ')}), preservando o que mudou depois na User Story?`,
  possivel_duplicidade: () => '\n\nCriar a nova User Story mesmo assim?',
};

// Aprova a proposta. Se a API pedir confirmação (proposta desatualizada ou possível duplicidade), pergunta ao
// analista e reenvia confirmando; se ele não confirmar, retorna `cancelled`. `createdStoryId` vem das novas necessidades.
export const approveSuggestion = async (
  suggestionId: string,
  confirm: (message: string) => boolean = window.confirm
): Promise<{ cancelled: boolean; createdStoryId: string | null }> => {
  const body = { aceitar_desatualizada: false, aceitar_duplicidade: false };
  for (;;) {
    try {
      const applied = await apiRequest<SuggestionOut>(`/sugestoes-atualizacao/${suggestionId}/aprovar`, { method: 'POST', body });
      return { cancelled: false, createdStoryId: applied.historia_criada_id ? String(applied.historia_criada_id) : null };
    } catch (error) {
      const reason = confirmationReason(error);
      if (!reason) throw error;
      const details = ((error as ApiError).detalhes ?? {}) as Record<string, unknown>;
      if (!confirm((error as ApiError).message + CONFIRMATION_QUESTION[reason](details))) {
        return { cancelled: true, createdStoryId: null };
      }
      body[reason === 'proposta_desatualizada' ? 'aceitar_desatualizada' : 'aceitar_duplicidade'] = true;
    }
  }
};

export const rejectSuggestion = (suggestionId: string, reason?: string) =>
  apiRequest<unknown>(`/sugestoes-atualizacao/${suggestionId}/rejeitar`, {
    method: 'POST',
    body: reason ? { motivo: reason } : undefined,
  });

// Cancelar: a proposta deixa de valer sem julgamento de mérito (ex.: desatualizada). Fica preservada com o motivo.
export const cancelSuggestion = (suggestionId: string, reason?: string) =>
  apiRequest<unknown>(`/sugestoes-atualizacao/${suggestionId}/cancelar`, {
    method: 'POST',
    body: reason ? { motivo: reason } : undefined,
  });
