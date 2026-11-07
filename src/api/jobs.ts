import { QueryClient, useQuery } from '@tanstack/react-query';
import { Job, JobStatus } from '../types.ts';
import { apiRequest } from './client.ts';
import type { components } from './schema';

type JobOut = components['schemas']['JobOut'];
type JobList = components['schemas']['JobList'];

const POLL_INTERVAL_MS = 3000;

export const jobsKey = (projectId: string) => ['jobs', projectId];

export const isJobActive = (job: Job): boolean => job.status === 'pendente' || job.status === 'processando';

const toJob = (j: JobOut): Job => {
  const params = j.parametros as { audio_ids?: number[]; documento_ids?: number[] };
  const result = (j.resultado ?? {}) as {
    total?: number;
    mensagem?: string | null;
    lotes_com_erro?: unknown[];
    falhas?: unknown[];
  };
  return {
    id: j.id,
    typeLabel: j.tipo_rotulo,
    isAnalysis: j.tipo === 'analise_atualizacao',
    status: j.status as JobStatus,
    statusLabel: j.status_rotulo,
    errorMessage: j.mensagem_erro ?? null,
    createdAt: String(j.criado_em ?? ''),
    audioIds: params.audio_ids ?? [],
    documentIds: params.documento_ids ?? [],
    createdCount: result.total ?? 0,
    resultMessage: result.mensagem ?? null,
    failureCount: (result.lotes_com_erro ?? result.falhas ?? []).length,
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

const startJob = async (
  queryClient: QueryClient,
  projectId: string,
  path: string,
  audioIds: string[],
  documentIds: string[]
): Promise<void> => {
  const job = await apiRequest<JobOut>(path, {
    method: 'POST',
    body: { audio_ids: audioIds.map(Number), documento_ids: documentIds.map(Number) },
  });
  // Entra no cache já ativo, para o acompanhamento não perder um job que termine depressa.
  queryClient.setQueryData<Job[]>(jobsKey(projectId), (jobs) => [toJob(job), ...(jobs ?? [])]);
};

export const startGeneration = (qc: QueryClient, projectId: string, audioIds: string[], documentIds: string[]) =>
  startJob(qc, projectId, `/projetos/${projectId}/historias/gerar`, audioIds, documentIds);

export const startAnalysis = (qc: QueryClient, projectId: string, audioIds: string[], documentIds: string[]) =>
  startJob(qc, projectId, `/projetos/${projectId}/atualizacoes/analisar`, audioIds, documentIds);
