import { QueryClient, useMutationState, useQuery } from '@tanstack/react-query';
import { Job, JobStage, JobStatus, JobType } from '../types.ts';
import { apiRequest } from './client.ts';
import { useStories } from './stories.ts';
import type { components } from './schema';

type JobOut = components['schemas']['JobOut'];
type JobList = components['schemas']['JobList'];

const POLL_INTERVAL_MS = 3000;

export const jobsKey = (projectId: string) => ['jobs', projectId];

export const isJobActive = (job: Job): boolean => job.status === 'pendente' || job.status === 'processando';

// Etapas do job de geração (backend: services/generation.py), na ordem em que rodam.
export const GENERATION_STAGES: Record<string, string> = {
  preparacao: 'Preparação das fontes',
  geracao_us: 'Geração das User Stories',
  consolidacao_us: 'Consolidação das User Stories',
  validacao_us: 'Validação das User Stories',
  geracao_criterios: 'Geração dos critérios de aceitação',
  validacao_criterios: 'Validação dos critérios',
  persistencia: 'Gravação das User Stories',
  auditoria_evidencias: 'Auditoria das evidências',
};

type StageOut = { etapa: string; status: JobStage['status']; duracao_s?: number; erro?: string | null };

const toStage = (s: StageOut): JobStage => ({
  name: s.etapa,
  label: GENERATION_STAGES[s.etapa] ?? s.etapa,
  status: s.status,
  durationSec: s.duracao_s ?? 0,
  error: s.erro ?? null,
});

const toJob = (j: JobOut): Job => {
  const params = j.parametros as { audio_ids?: number[]; documento_ids?: number[]; historia_ids?: number[] };
  const result = (j.resultado ?? {}) as {
    total?: number;
    historias_criadas?: number[];
    analise_id?: number | null;
    mensagem?: string | null;
    lotes_com_erro?: unknown[];
    falhas?: unknown[];
    etapas?: StageOut[];
    criterios?: { falhas?: unknown[] };
  };
  return {
    id: j.id,
    type: j.tipo as JobType,
    typeLabel: j.tipo_rotulo,
    isAnalysis: j.tipo === 'analise_atualizacao',
    status: j.status as JobStatus,
    statusLabel: j.status_rotulo,
    errorMessage: j.mensagem_erro ?? null,
    createdAt: String(j.criado_em ?? ''),
    audioIds: params.audio_ids ?? [],
    documentIds: params.documento_ids ?? [],
    storyIds: params.historia_ids ?? [],
    createdCount: result.total ?? 0,
    createdStoryIds: result.historias_criadas ?? [],
    analysisId: result.analise_id != null ? String(result.analise_id) : null,
    resultMessage: result.mensagem ?? null,
    failureCount: (result.lotes_com_erro ?? result.falhas ?? []).length,
    stages: (result.etapas ?? []).map(toStage),
    criteriaFailureCount: (result.criterios?.falhas ?? []).length,
  };
};

export const useJobs = (projectId: string) =>
  useQuery({
    queryKey: jobsKey(projectId),
    queryFn: async () => {
      const { itens } = await apiRequest<JobList>(`/projetos/${projectId}/jobs`);
      return itens.map(toJob).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    refetchInterval: (query) => (query.state.data?.some(isJobActive) ? POLL_INTERVAL_MS : false),
  });

// US em avaliação de qualidade agora: avaliação individual em andamento (mutação ['avaliar', id])
// ou incluída num job de avaliação em lote ainda ativo e ainda sem nota. O lote é oferecido para
// histórias recém-geradas (sem nota): cada uma sai do carregamento assim que sua nota aparece,
// sem esperar o fim do lote. Enquanto o lote roda, a lista de histórias é recarregada.
export const useEvaluatingStoryIds = (projectId: string): Set<string> => {
  const { data: jobs = [] } = useJobs(projectId);
  const batchIds = jobs
    .filter((job) => job.type === 'avaliacao_qualidade' && isJobActive(job))
    .flatMap((job) => job.storyIds.map(String));
  const { data: stories = [] } = useStories(projectId, batchIds.length > 0 ? POLL_INTERVAL_MS : false);
  const scored = new Set(stories.filter((s) => s.qualityScore !== null).map((s) => s.id));
  const single = useMutationState({
    filters: { mutationKey: ['avaliar'], status: 'pending' },
    select: (mutation) => String(mutation.options.mutationKey?.[1] ?? ''),
  });
  return new Set([...single, ...batchIds.filter((id) => !scored.has(id))]);
};

const startJob = async (queryClient: QueryClient, projectId: string, path: string, body: object): Promise<void> => {
  const job = await apiRequest<JobOut>(path, { method: 'POST', body });
  // Entra no cache já ativo, para o acompanhamento não perder um job que termine depressa.
  queryClient.setQueryData<Job[]>(jobsKey(projectId), (jobs) => [toJob(job), ...(jobs ?? [])]);
};

const sourcesBody = (audioIds: string[], documentIds: string[]) => ({
  audio_ids: audioIds.map(Number),
  documento_ids: documentIds.map(Number),
});

// Etapa anterior à geração: grava a análise das fontes (não revisada) para o analista revisar e aprovar.
export const startSourceAnalysis = (qc: QueryClient, projectId: string, audioIds: string[], documentIds: string[]) =>
  startJob(qc, projectId, `/projetos/${projectId}/analises/gerar`, sourcesBody(audioIds, documentIds));

// Exige a análise aprovada que orienta a geração.
export const startGeneration = (
  qc: QueryClient,
  projectId: string,
  audioIds: string[],
  documentIds: string[],
  analysisId: string
) =>
  startJob(qc, projectId, `/projetos/${projectId}/historias/gerar`, {
    ...sourcesBody(audioIds, documentIds),
    analise_id: Number(analysisId),
  });

export const startAnalysis = (qc: QueryClient, projectId: string, audioIds: string[], documentIds: string[]) =>
  startJob(qc, projectId, `/projetos/${projectId}/atualizacoes/analisar`, sourcesBody(audioIds, documentIds));

export const startQualityEvaluation = (qc: QueryClient, projectId: string, storyIds: number[]) =>
  startJob(qc, projectId, `/projetos/${projectId}/historias/avaliar`, { historia_ids: storyIds });
