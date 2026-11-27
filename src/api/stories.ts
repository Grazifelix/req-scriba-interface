import { useQuery } from '@tanstack/react-query';
import {
  AuditItem,
  AuditResult,
  AudioEvidence,
  CriterionSource,
  DocumentEvidence,
  EvidenceAudit,
  StructuralIssue,
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
  qualityRewrite: s.reescrita_sugerida ?? null,
});

// A API não tem como rejeitar a reescrita da avaliação; a decisão fica guardada neste navegador.
const DISMISSED_REWRITES_KEY = 'reqscriba.reescritas_rejeitadas';

export const getDismissedRewrites = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_REWRITES_KEY) ?? '{}');
  } catch {
    return {};
  }
};

export const dismissRewrite = (storyId: string, text: string): void => {
  try {
    localStorage.setItem(DISMISSED_REWRITES_KEY, JSON.stringify({ ...getDismissedRewrites(), [storyId]: text }));
  } catch {
    // Sem armazenamento local, a decisão vale apenas nesta sessão.
  }
};

// O LLM às vezes devolve um aviso ("Nenhuma reescrita sugerida.") ou uma instrução no lugar da reescrita:
// só conta como sugestão o texto que traz ao menos uma história no padrão "Como …, quero …".
const STORY_PATTERN = /\bcomo\s[^,;.]+,\s*(?:eu\s+)?(?:quero|gostaria|preciso|desejo)\b/i;
const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').replace(/[\s.;]+$/, '').trim();

// Reescrita da avaliação ainda aguardando decisão: é uma história, muda o texto e não foi rejeitada neste navegador.
export const pendingRewrite = (story: StorySummary, dismissed: Record<string, string>): string | null => {
  const rewrite = story.qualityRewrite?.trim();
  if (!rewrite || !STORY_PATTERN.test(rewrite)) return null;
  if (normalize(rewrite) === normalize(story.summary)) return null;
  return dismissed[story.id] === story.qualityRewrite ? null : story.qualityRewrite;
};

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
      number: v.numero,
      version: `v${v.numero}`,
      statusLabel: (v.status_historia_rotulo as string | null | undefined) ?? null,
      sources: (v.fontes ?? []).map((f) => String((f as { nome_arquivo?: string }).nome_arquivo ?? '')).filter(Boolean),
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

type CriterionOut = StoryOut['criterios_aceitacao'][number];

// Elemento das lacunas da etapa de critérios em `informacoes_ausentes` (mostradas no card de critérios).
const CRITERIA_GAP = 'criterios_aceitacao';

const PART_LABELS: Record<string, string> = { dado: 'Dado', quando: 'Quando', entao: 'Então' };

// Trechos que sustentam a HU, por id do trecho da fonte: os critérios citam esses ids.
const excerptsByChunk = (s: StoryOut): Map<number, Omit<CriterionSource, 'chunkId' | 'parts'>> => {
  const map = new Map<number, Omit<CriterionSource, 'chunkId' | 'parts'>>();
  for (const e of s.fontes_audio as SourceExcerpt[]) {
    if (e.trecho_id != null) map.set(e.trecho_id, { fileName: e.nome_arquivo, location: String(e.inicio_formatado ?? ''), quote: e.trecho });
  }
  for (const e of s.fontes_documentos as SourceExcerpt[]) {
    if (e.trecho_id != null) map.set(e.trecho_id, { fileName: e.nome_arquivo, location: e.pagina ? `Página ${e.pagina}` : 'Documento', quote: e.trecho });
  }
  return map;
};

type AuditItemOut = {
  resultado: AuditResult;
  problemas?: string[];
  correcao_proposta?: string | null;
  componentes_sem_sustentacao?: string[];
  origem_resultado?: string;
};
type AuditOut = {
  auditoria_id: number;
  desatualizada: boolean;
  data_hora: string;
  componentes: Array<AuditItemOut & { componente: string }>;
  criterios: Array<AuditItemOut & { criterio_id: number }>;
  resumo: Record<string, number>;
};

const toAuditItem = (i: AuditItemOut): AuditItem => ({
  result: i.resultado,
  problems: i.problemas ?? [],
  correction: i.correcao_proposta ?? null,
  unsupportedParts: (i.componentes_sem_sustentacao ?? []).map((p) => PART_LABELS[p] ?? p),
  byModel: i.origem_resultado !== 'codigo',
});

const toAudit = (a: AuditOut | null | undefined): EvidenceAudit | null => {
  if (!a) return null;
  const total = a.resumo.total_afirmacoes_avaliadas ?? 0;
  const compatible = a.resumo.compativeis ?? 0;
  return {
    id: String(a.auditoria_id),
    outdated: a.desatualizada,
    date: new Date(a.data_hora).toLocaleString('pt-BR'),
    components: Object.fromEntries(a.componentes.map((c) => [c.componente, toAuditItem(c)])),
    criteria: Object.fromEntries(a.criterios.map((c) => [c.criterio_id, toAuditItem(c)])),
    total,
    compatible,
    attention: total - compatible,
  };
};

const toCriterion = (c: CriterionOut, excerpts: ReturnType<typeof excerptsByChunk>): TestCriterion => ({
  id: c.id,
  criterionId: c.criterio_id ?? undefined,
  title: c.titulo,
  criterion: c.criterio,
  given: c.dado ?? undefined,
  when: c.quando ?? undefined,
  then: c.entao ?? undefined,
  sources: (c.fontes ?? []).map((f) => ({
    chunkId: f.trecho_id,
    parts: f.afirmacoes_sustentadas.map((p) => PART_LABELS[p] ?? p),
    ...(excerpts.get(f.trecho_id) ?? { fileName: 'Trecho da fonte', location: '', quote: '' }),
  })),
  warnings: c.afirmacoes_sem_evidencia ?? [],
  aiGenerated: c.origem === 'ia',
});

const isCriteriaGap = (i: Record<string, unknown>) => i.elemento === CRITERIA_GAP;
const gapText = (i: Record<string, unknown>) => String(i.descricao ?? i.elemento ?? '');

const toStory = (s: StoryOut): UserStory => ({
  ...toSummary(s),
  actor: s.perfil ?? '',
  action: s.funcionalidade ?? '',
  benefit: s.beneficio ?? '',
  criteria: s.criterios_aceitacao.map((c) => toCriterion(c, excerptsByChunk(s))),
  criteriaGaps: s.informacoes_ausentes.filter(isCriteriaGap).map(gapText).filter(Boolean),
  evidenceAudit: toAudit(s.auditoria_evidencias as AuditOut | null | undefined),
  qualityOutdated: Boolean(s.qualidade_geral?.desatualizada),
  missingInfo: s.informacoes_ausentes.filter((i) => !isCriteriaGap(i)).map(gapText).filter(Boolean),
  unsupportedClaims: s.afirmacoes_sem_evidencia,
  audioEvidence: s.fontes_audio.map(toAudioEvidence),
  documentEvidence: s.fontes_documentos.map(toDocumentEvidence),
  heuristics: toHeuristics(s.criterios_qus),
  versions: toVersions(s),
});

// `pollMs`: recarrega a lista periodicamente (ex.: enquanto uma avaliação em lote preenche as notas).
export const useStories = (projectId: string, pollMs: number | false = false) =>
  useQuery({
    queryKey: storiesKey(projectId),
    queryFn: async () => (await apiRequest<StoryList>(`/projetos/${projectId}/historias`)).itens.map(toSummary),
    refetchInterval: pollMs,
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

// Aplica a reescrita da avaliação. Se ela dividir a história ("H1: …; H2: …"), a API cria as demais.
export const applyRewrite = async (storyId: string, text: string): Promise<string[]> => {
  const result = await apiRequest<{ historia: StoryOut; historias_criadas: StoryOut[] }>(
    `/historias/${storyId}/aplicar-reescrita`,
    { method: 'POST', body: { historia: text } }
  );
  return result.historias_criadas.map((s) => s.codigo);
};

// A API rejeita campos desconhecidos: critérios vão sem `id` (ela os renumera).
export const criteriaPayload = (criteria: TestCriterion[]) =>
  criteria.map((c) => ({ titulo: c.title || undefined, criterio: c.criterion }));

// Etapa GERACAO_CRITERIOS_ACEITACAO para uma HU gravada: substitui os critérios numa nova versão
// (a anterior fica no histórico). A API recusa HU aprovada (409) e devolve 502 se o LLM falhar.
export const generateCriteria = (storyId: string) =>
  apiRequest<StoryOut>(`/historias/${storyId}/criterios/gerar`, { method: 'POST' });

// Auditoria semântica das evidências (VALIDACAO_EVIDENCIAS): não altera a história; 502 se o LLM falhar.
export const auditEvidence = (storyId: string) =>
  apiRequest<unknown>(`/historias/${storyId}/auditoria-evidencias`, { method: 'POST' });

export interface VersionComparison {
  changedFields: string[];
  addedCriteria: string[];
  removedCriteria: string[];
  criteriaTracked: boolean;
  addedEvidence: string[];
}

const COMPARED_FIELD_LABELS: Record<string, string> = {
  titulo: 'Título', perfil: 'Perfil', funcionalidade: 'Funcionalidade', beneficio: 'Benefício',
  historia: 'Texto da história', criterios_aceitacao: 'Critérios de aceitação',
};

// Diferenças entre duas versões (US-20): campos, critérios por id permanente e evidências adicionadas.
export const useVersionComparison = (storyId: string, from: number, to: number, enabled: boolean) =>
  useQuery({
    queryKey: ['comparacao-versoes', storyId, from, to],
    enabled,
    queryFn: async (): Promise<VersionComparison> => {
      const c = await apiRequest<{
        conteudo: { campos_alterados: string[] };
        criterios: { registrados: boolean; adicionados: Array<{ criterio: string }>; removidos: Array<{ criterio: string }> };
        evidencias: { adicionadas: Array<{ nome_arquivo: string; trecho: string }> };
      }>(`/historias/${storyId}/versoes/comparacao?de=${from}&para=${to}`);
      return {
        changedFields: c.conteudo.campos_alterados.map((f) => COMPARED_FIELD_LABELS[f] ?? f),
        addedCriteria: c.criterios.adicionados.map((x) => x.criterio),
        removedCriteria: c.criterios.removidos.map((x) => x.criterio),
        criteriaTracked: c.criterios.registrados,
        addedEvidence: c.evidencias.adicionadas.map((e) => `${e.nome_arquivo}: ${e.trecho}`),
      };
    },
  });

export const structuralValidationKey = (storyId: string) => ['validacao-estrutural', storyId];

// Validação estrutural (código, sem LLM): referências, ids, citações divergentes e vínculos das versões.
export const useStructuralValidation = (storyId: string) =>
  useQuery({
    queryKey: structuralValidationKey(storyId),
    queryFn: async () => {
      const report = await apiRequest<{
        problemas: Array<{ tipo: string; severidade: 'erro' | 'aviso'; alvo: { tipo: string }; mensagem: string }>;
      }>(`/historias/${storyId}/validacao-estrutural`);
      return report.problemas.map((p): StructuralIssue => ({
        type: p.tipo,
        severity: p.severidade,
        target: p.alvo.tipo,
        message: p.mensagem,
      }));
    },
  });

export const approveStory = (storyId: string) =>
  apiRequest<unknown>(`/historias/${storyId}/aprovar`, { method: 'POST' });

export const rejectStory = (storyId: string) =>
  apiRequest<unknown>(`/historias/${storyId}/desaprovar`, { method: 'POST' });

export const evaluateStory = async (storyId: string): Promise<number> => {
  const evaluation = await apiRequest<EvaluationOut>(`/historias/${storyId}/avaliar`, { method: 'POST' });
  return evaluation.qualidade_geral.porcentagem;
};
