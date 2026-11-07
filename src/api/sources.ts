import { useQuery } from '@tanstack/react-query';
import { AudioSource, DocumentSource, SourceStatus, TranscriptSegment } from '../types.ts';
import { apiFileUrl, apiRequest } from './client.ts';
import type { components } from './schema';

type AudioOut = components['schemas']['AudioOut'];
type AudioList = components['schemas']['AudioList'];
type DocumentOut = components['schemas']['DocumentOut'];
type DocumentList = components['schemas']['DocumentList'];
type DocumentContentOut = components['schemas']['DocumentContentOut'];
type TranscriptionOut = components['schemas']['TranscriptionOut'];

const POLL_INTERVAL_MS = 3000;

export const audiosKey = (projectId: string) => ['audios', projectId];
export const documentsKey = (projectId: string) => ['documentos', projectId];
export const transcriptKey = (audioId: string) => ['transcricao', audioId];

export const isSourceActive = (status: SourceStatus): boolean => status === 'pendente' || status === 'processando';

const toAudio = (a: AudioOut): AudioSource => ({
  id: String(a.id),
  title: a.nome_arquivo,
  durationLabel: a.duracao_formatada ?? null,
  status: a.status as SourceStatus,
  statusLabel: a.status_rotulo,
  errorMessage: a.mensagem_erro ?? null,
  canRetry: a.pode_reprocessar,
  url: apiFileUrl(a.url_arquivo),
});

const toDocument = (d: DocumentOut): DocumentSource => ({
  id: String(d.id),
  title: d.nome_arquivo,
  isSpreadsheet: /\.xlsx?$/i.test(d.nome_arquivo),
  status: d.status as SourceStatus,
  statusLabel: d.status_rotulo,
  errorMessage: d.mensagem_erro ?? null,
  canRetry: d.pode_reprocessar,
  pageCount: d.total_paginas ?? null,
});

const upload = (path: string, file: File) => {
  const form = new FormData();
  form.append('arquivo', file);
  return apiRequest<unknown>(path, { method: 'POST', form });
};

export const uploadAudio = (projectId: string, file: File) => upload(`/projetos/${projectId}/audios`, file);
export const uploadDocument = (projectId: string, file: File) => upload(`/projetos/${projectId}/documentos`, file);

export const retryAudio = (id: string) => apiRequest<unknown>(`/audios/${id}/reprocessar`, { method: 'POST' });
export const retryDocument = (id: string) => apiRequest<unknown>(`/documentos/${id}/reprocessar`, { method: 'POST' });
export const deleteAudio = (id: string) => apiRequest<void>(`/audios/${id}`, { method: 'DELETE' });
export const deleteDocument = (id: string) => apiRequest<void>(`/documentos/${id}`, { method: 'DELETE' });

export const getTranscript = async (audioId: string): Promise<TranscriptSegment[]> => {
  const { segmentos } = await apiRequest<TranscriptionOut>(`/audios/${audioId}/transcricao`);
  return segmentos.map((s) => ({
    id: String(s.id),
    text: s.texto,
    startSec: s.inicio_segundos,
    endSec: s.fim_segundos,
    startLabel: s.inicio_formatado,
    edited: s.editado,
  }));
};

export const updateSegment = (audioId: string, segmentId: string, text: string) =>
  apiRequest<unknown>(`/audios/${audioId}/segmentos/${segmentId}`, { method: 'PATCH', body: { texto: text } });

export const getDocumentText = async (documentId: string): Promise<string> => {
  const { texto_extraido } = await apiRequest<DocumentContentOut>(`/documentos/${documentId}/conteudo`);
  return texto_extraido;
};

export const useAudios = (projectId: string) =>
  useQuery({
    queryKey: audiosKey(projectId),
    queryFn: async () => (await apiRequest<AudioList>(`/projetos/${projectId}/audios`)).itens.map(toAudio),
    refetchInterval: (query) => (query.state.data?.some((a) => isSourceActive(a.status)) ? POLL_INTERVAL_MS : false),
  });

export const useDocuments = (projectId: string) =>
  useQuery({
    queryKey: documentsKey(projectId),
    queryFn: async () => (await apiRequest<DocumentList>(`/projetos/${projectId}/documentos`)).itens.map(toDocument),
    refetchInterval: (query) => (query.state.data?.some((d) => isSourceActive(d.status)) ? POLL_INTERVAL_MS : false),
  });
