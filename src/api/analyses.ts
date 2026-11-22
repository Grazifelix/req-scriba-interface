import { useQuery } from '@tanstack/react-query';
import { AnalysisItem, AnalysisItemType, ProjectAnalysis } from '../types.ts';
import { apiRequest } from './client.ts';
import type { components } from './schema';

type AnalysisOut = components['schemas']['AnalysisOut'];
type AnalysisList = components['schemas']['AnalysisList'];
type AnalysisItemOut = components['schemas']['AnalysisItemOut'];

export const analysisKey = (analysisId: string) => ['analise', analysisId];
export const latestAnalysisKey = (projectId: string) => ['analise-recente', projectId];

const toItem = (i: AnalysisItemOut): AnalysisItem => ({
  id: String(i.id),
  type: i.tipo as AnalysisItemType,
  code: i.codigo,
  text: i.texto,
  complement: i.complemento ?? '',
  references: i.referencias,
  hasEvidence: i.possui_evidencia,
  sourceNames: [...new Set(i.evidencias.map((e) => e.nome_arquivo))],
});

const toAnalysis = (a: AnalysisOut): ProjectAnalysis => ({
  id: String(a.id),
  jobId: a.job_id,
  system: a.sistema ?? '',
  reviewed: a.revisada,
  items: a.itens.map(toItem),
});

export const useAnalysis = (analysisId: string) =>
  useQuery({
    queryKey: analysisKey(analysisId),
    queryFn: async () => toAnalysis(await apiRequest<AnalysisOut>(`/analises/${analysisId}`)),
  });

// A mais recente do projeto (a API lista da mais nova para a mais antiga).
export const useLatestAnalysis = (projectId: string) =>
  useQuery({
    queryKey: latestAnalysisKey(projectId),
    queryFn: async () => {
      const { itens } = await apiRequest<AnalysisList>(`/projetos/${projectId}/analises`);
      return itens.length > 0 ? toAnalysis(itens[0]) : null;
    },
  });

export const updateAnalysis = (analysisId: string, changes: { sistema?: string | null; revisada?: boolean }) =>
  apiRequest<unknown>(`/analises/${analysisId}`, { method: 'PATCH', body: changes });

export const addAnalysisItem = (analysisId: string, type: AnalysisItemType, text: string, complement: string) =>
  apiRequest<unknown>(`/analises/${analysisId}/itens`, {
    method: 'POST',
    body: { tipo: type, texto: text, complemento: complement || null },
  });

export const updateAnalysisItem = (analysisId: string, itemId: string, text: string, complement: string) =>
  apiRequest<unknown>(`/analises/${analysisId}/itens/${itemId}`, {
    method: 'PATCH',
    body: { texto: text, complemento: complement || null },
  });

export const deleteAnalysisItem = (analysisId: string, itemId: string) =>
  apiRequest<unknown>(`/analises/${analysisId}/itens/${itemId}`, { method: 'DELETE' });
