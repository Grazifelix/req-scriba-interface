import { useQuery } from '@tanstack/react-query';
import {
  AudioEvidence,
  DocumentEvidence,
  HeuristicCategory,
  HeuristicItem,
  StoryStatus,
  StorySummary,
  StoryVersion,
  TestCriterion,
  UserStory,
} from '../types.ts';
import { apiFileUrl, apiRequest } from './client.ts';
import type { components } from './schema';

type StorySummaryOut = components['schemas']['StorySummaryOut'];
type StoryList = components['schemas']['StoryList'];
type StoryOut = components['schemas']['StoryOut'];
type EvaluationOut = components['schemas']['EvaluationOut'];
type CriterionEntry = { resultado?: string; evidencia?: string; observacao?: string; acao?: string };

export const storiesKey = (projectId: string) => ['historias', projectId];
export const storyKey = (storyId: string) => ['historia', storyId];
export const evaluationMutationKey = (storyId: string) => ['avaliar', storyId];

const STATUS_LABELS: Record<string, StoryStatus> = {
  em_revisao: 'Em revisão',
  falta_informacao: 'Falta Informação',
  aprovada: 'Aprovada',
  desaprovada: 'Desaprovada',
};

// As 13 heurísticas QUS da API, nas três colunas da tela (3 + 4 + 6).
const CRITERIA: Array<[string, string, HeuristicCategory]> = [
  ['well_formed', 'Bem formada', '1. Estrutura do Texto'],
  ['minimal', 'Mínima', '1. Estrutura do Texto'],
  ['full_sentence', 'Frase completa', '1. Estrutura do Texto'],
  ['atomic', 'Atômica', '2. Sentido e Negócio'],
  ['conceptually_sound', 'Conceitualmente sólida', '2. Sentido e Negócio'],
  ['problem_oriented', 'Orientada ao problema', '2. Sentido e Negócio'],
  ['unambiguous', 'Não ambígua', '2. Sentido e Negócio'],
  ['estimatable', 'Estimável', '3. Prática e Execução'],
  ['conflict_free', 'Livre de conflitos', '3. Prática e Execução'],
  ['unique', 'Única', '3. Prática e Execução'],
  ['uniform', 'Uniforme', '3. Prática e Execução'],
  ['independent', 'Independente', '3. Prática e Execução'],
  ['complete', 'Completa', '3. Prática e Execução'],
];

const RESULT_LABELS: Record<string, HeuristicItem['status']> = {
  Atende: 'Atendido',
  'Atenção': 'Atenção',
  'Não atende': 'Não atende',
};

export const formatScore = (score: number | null): string =>
  score === null ? '—' : `${String(score).replace('.', ',')}%`;

const toSummary = (s: StorySummaryOut): StorySummary => ({
  id: String(s.id),
  code: s.codigo,
  title: s.titulo,
  summary: s.historia,
  status: STATUS_LABELS[s.status] ?? 'Em revisão',
  qualityScore: s.qualidade_geral?.porcentagem ?? null,
  qualityLabel: s.qualidade_geral?.status ?? 'Sem avaliação',
  hasMissingInfo: Boolean(s.possui_informacoes_ausentes),
});

const toHeuristics = (block: StoryOut['criterios_qus']): HeuristicItem[] => {
  if (!block) return [];
  const individual = (block.avaliacao_criterios ?? {}) as Record<string, CriterionEntry>;
  const set = (block.analise_transversal_conjunto ?? {}) as Record<string, CriterionEntry>;
  return CRITERIA.flatMap(([key, name, category]) => {
    const entry = individual[key] ?? set[key];
    if (!entry) return [];
    const status = RESULT_LABELS[entry.resultado ?? ''] ?? 'Atenção';
    return [{
      id: key,
      name,
      category,
      status,
      description: entry.evidencia ?? entry.observacao ?? '',
      tip: status === 'Atendido' ? undefined : entry.acao,
    }];
  });
};

const toVersions = (s: StoryOut): StoryVersion[] =>
  [...s.versoes]
    .sort((a, b) => b.numero - a.numero)
    .map((v) => ({
      version: `v${v.numero}`,
      type: String(v.origem_alteracao_rotulo ?? v.origem_alteracao),
      isAi: v.originada_por_ia,
      author: v.responsavel,
      timestamp: new Date(v.data_hora).toLocaleString('pt-BR'),
      text: v.historia ?? '',
      isCurrent: v.numero === s.versao_atual,
    }));

// Fontes de uma HU (com evidencia_id) ou de uma sugestão (só trecho_id, ainda não gravadas).
type SourceExcerpt = {
  evidencia_id?: number | null;
  trecho_id?: number | null;
  nome_arquivo: string;
  trecho: string;
  inicio_formatado?: unknown;
  url_momento?: unknown;
  pagina?: unknown;
};

const excerptId = (e: SourceExcerpt, index: number) => String(e.evidencia_id ?? e.trecho_id ?? `trecho-${index}`);

export const toAudioEvidence = (e: SourceExcerpt, index = 0): AudioEvidence => ({
  id: excerptId(e, index),
  title: e.nome_arquivo,
  timestamp: String(e.inicio_formatado ?? ''),
  quote: e.trecho,
  url: e.url_momento ? apiFileUrl(String(e.url_momento)) : '',
});

export const toDocumentEvidence = (e: SourceExcerpt, index = 0): DocumentEvidence => ({
  id: excerptId(e, index),
  title: e.nome_arquivo,
  page: e.pagina ? `Página ${e.pagina}` : 'Documento',
  quote: e.trecho,
});

const toCriterion = (c: StoryOut['criterios_aceitacao'][number]): TestCriterion => ({
  id: c.id,
  title: c.titulo,
  criterion: c.criterio,
});

const toStory = (s: StoryOut): UserStory => ({
  ...toSummary(s),
  actor: s.perfil ?? '',
  action: s.funcionalidade ?? '',
  benefit: s.beneficio ?? '',
  criteria: s.criterios_aceitacao.map(toCriterion),
  qualityOutdated: Boolean(s.qualidade_geral?.desatualizada),
  qualityRewrite: (s.criterios_qus?.reescrita_sugerida as string | null | undefined) ?? null,
  missingInfo: s.informacoes_ausentes.map((i) => String(i.descricao ?? i.elemento ?? '')).filter(Boolean),
  unsupportedClaims: s.afirmacoes_sem_evidencia,
  audioEvidence: s.fontes_audio.map(toAudioEvidence),
  documentEvidence: s.fontes_documentos.map(toDocumentEvidence),
  heuristics: toHeuristics(s.criterios_qus),
  versions: toVersions(s),
});

export const useStories = (projectId: string) =>
  useQuery({
    queryKey: storiesKey(projectId),
    queryFn: async () => (await apiRequest<StoryList>(`/projetos/${projectId}/historias`)).itens.map(toSummary),
  });

export const useStory = (storyId: string | null) =>
  useQuery({
    queryKey: storyKey(storyId ?? ''),
    queryFn: async () => toStory(await apiRequest<StoryOut>(`/historias/${storyId}`)),
    enabled: !!storyId,
  });

export interface StoryChanges {
  perfil?: string;
  funcionalidade?: string;
  beneficio?: string;
  historia?: string;
  criterios_aceitacao?: Array<{ titulo?: string; criterio: string }>;
}

export const updateStory = (storyId: string, changes: StoryChanges) =>
  apiRequest<unknown>(`/historias/${storyId}`, { method: 'PATCH', body: changes });

// A API rejeita campos desconhecidos: critérios vão sem `id` (ela os renumera).
export const criteriaPayload = (criteria: TestCriterion[]) =>
  criteria.map((c) => ({ titulo: c.title || undefined, criterio: c.criterion }));

export const approveStory = (storyId: string) =>
  apiRequest<unknown>(`/historias/${storyId}/aprovar`, { method: 'POST' });

export const rejectStory = (storyId: string) =>
  apiRequest<unknown>(`/historias/${storyId}/desaprovar`, { method: 'POST' });

export const evaluateStory = async (storyId: string): Promise<number> => {
  const evaluation = await apiRequest<EvaluationOut>(`/historias/${storyId}/avaliar`, { method: 'POST' });
  return evaluation.qualidade_geral.porcentagem;
};
