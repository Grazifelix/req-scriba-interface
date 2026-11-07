import React, { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../api/client.ts';
import { isJobActive, startAnalysis, startGeneration, useJobs } from '../api/jobs.ts';
import { PROJECTS_QUERY_KEY } from '../api/projects.ts';
import {
  audiosKey,
  deleteAudio,
  deleteDocument,
  documentsKey,
  getDocumentText,
  getTranscript,
  isSourceActive,
  retryAudio,
  retryDocument,
  transcriptKey,
  updateSegment,
  uploadAudio,
  uploadDocument,
  useAudios,
  useDocuments,
} from '../api/sources.ts';
import { useStories } from '../api/stories.ts';
import { AudioSource, DocumentSource, Project, ScreenType, SourceStatus, StagedFile, TranscriptSegment } from '../types.ts';

const AUDIO_ACCEPT = '.mp3,.wav,.m4a,.ogg,.flac,.webm,.mp4';
const DOCUMENT_ACCEPT = '.pdf,.docx,.txt,.md,.xlsx';
const MAX_AUDIO_MB = 200;
const MAX_DOCUMENT_MB = 20;

const formatFileSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const STATUS_STYLES: Record<SourceStatus, string> = {
  pendente: 'bg-surface-container-highest text-on-surface-variant',
  processando: 'bg-primary-fixed text-on-primary-fixed',
  concluido: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  erro: 'bg-error-container text-on-error-container',
};

const SourceBadge: React.FC<{ status: SourceStatus; label: string }> = ({ status, label }) => (
  <span className={`text-[11px] px-2 py-0.5 rounded font-semibold flex items-center gap-1 ${STATUS_STYLES[status]}`}>
    {isSourceActive(status) && (
      <span className="inline-block w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
    )}
    {label}
  </span>
);

const iconButton = 'p-1 rounded text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer';
const linkButton =
  'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-surface-container border border-outline-variant/20 text-primary text-xs font-semibold transition-colors shadow-xs shrink-0 cursor-pointer';

interface SourceActionsProps {
  showToast: (msg: string, icon?: string) => void;
  onChanged: () => Promise<void>;
}

// -- Transcrição -------------------------------------------------------------
const Transcript: React.FC<{
  audioId: string;
  currentSec: number;
  onSeek: (segment: TranscriptSegment) => void;
  showToast: (msg: string, icon?: string) => void;
}> = ({ audioId, currentSec, onSeek, showToast }) => {
  const queryClient = useQueryClient();
  const { data: segments = [], isPending, error } = useQuery({
    queryKey: transcriptKey(audioId),
    queryFn: () => getTranscript(audioId),
  });
  const [drafts, setDrafts] = useState<Record<string, string> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!drafts) return;
    const changed = segments.filter((s) => drafts[s.id] !== undefined && drafts[s.id].trim() !== s.text);
    if (changed.some((s) => !drafts[s.id].trim())) {
      showToast('Um trecho não pode ficar vazio.', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      for (const segment of changed) await updateSegment(audioId, segment.id, drafts[segment.id].trim());
      setDrafts(null);
      showToast(changed.length ? 'Transcrição corrigida.' : 'Nenhuma alteração para salvar.');
    } catch (e) {
      showToast(errorMessage(e), 'error');
    } finally {
      await queryClient.invalidateQueries({ queryKey: transcriptKey(audioId) });
      setIsSaving(false);
    }
  };

  if (isPending) return <p role="status" className="text-xs text-on-surface-variant">Carregando transcrição...</p>;
  if (error) return <p role="alert" className="text-xs text-error">{errorMessage(error)}</p>;
  if (segments.length === 0) return <p className="text-xs text-on-surface-variant">Nenhuma fala foi identificada neste áudio.</p>;

  const activeId = segments.find((s) => currentSec >= s.startSec && currentSec < s.endSec)?.id;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
        <span className="text-xs text-on-surface font-bold">
          {drafts ? 'Editando Transcrição' : 'Transcrição'} ({segments.length} trechos)
        </span>
        {drafts ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setDrafts(null)} disabled={isSaving} className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface-variant text-xs font-semibold cursor-pointer">
              Cancelar
            </button>
            <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-1 px-3.5 py-1 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer">
              <span className="material-symbols-outlined text-[15px]">check</span>
              <span>{isSaving ? 'Salvando...' : 'Salvar Transcrição'}</span>
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setDrafts({})} className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white hover:bg-surface-container border border-outline-variant/30 text-primary text-xs font-semibold shadow-2xs cursor-pointer">
            <span className="material-symbols-outlined text-[15px]">edit</span>
            <span>Editar Transcrição</span>
          </button>
        )}
      </div>

      {drafts ? (
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
          <p className="text-[11px] text-on-surface-variant">A correção substitui o texto nas próximas extrações. O original é preservado.</p>
          {segments.map((s) => (
            <label key={s.id} className="flex flex-col gap-1 p-2.5 bg-white rounded-xl border border-outline-variant/30">
              <span className="font-mono text-[11px] font-bold text-primary">{s.startLabel}</span>
              <textarea
                value={drafts[s.id] ?? s.text}
                maxLength={2000}
                rows={2}
                onChange={(e) => setDrafts({ ...drafts, [s.id]: e.target.value })}
                className="w-full p-2 text-xs bg-surface border border-outline-variant/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 text-on-surface resize-none leading-relaxed"
              />
            </label>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
          {segments.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSeek(s)}
              aria-current={activeId === s.id}
              title="Ouvir a partir deste trecho"
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex gap-2 items-start ${
                activeId === s.id ? 'bg-primary-fixed/30 border-primary/50' : 'bg-white border-outline-variant/20 hover:border-primary/30'
              }`}
            >
              <span className="font-mono text-[11px] font-bold text-primary shrink-0">{s.startLabel}</span>
              <span className="text-xs text-on-surface-variant leading-relaxed">
                {s.text}
                {s.edited && <em className="ml-1 text-[10px] text-outline not-italic">(corrigido)</em>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// -- Áudio ---------------------------------------------------------------------
const AudioCard: React.FC<{ audio: AudioSource } & SourceActionsProps> = ({ audio, showToast, onChanged }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);

  const handleSeek = (segment: TranscriptSegment) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = segment.startSec;
    audioRef.current.play().catch(() => showToast('Não foi possível reproduzir este áudio.', 'error'));
  };

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      await onChanged();
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  };

  return (
    <div data-testid="audio-card" className="bg-surface-container-low rounded-xl border border-outline-variant/20 p-4 flex flex-col gap-3 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 text-primary shadow-xs">
            <span className="material-symbols-outlined text-[20px]">mic</span>
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-on-surface leading-tight truncate">{audio.title}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {audio.durationLabel && (
                <span className="text-[11px] bg-surface-container-highest px-2 py-0.5 rounded text-on-surface-variant font-medium">{audio.durationLabel}</span>
              )}
              <SourceBadge status={audio.status} label={audio.statusLabel} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {audio.status === 'concluido' && (
            <button type="button" onClick={() => setIsExpanded(!isExpanded)} className={linkButton}>
              <span className="material-symbols-outlined text-[16px]">format_quote</span>
              <span>{isExpanded ? 'Recolher transcrição' : 'Ver transcrição'}</span>
            </button>
          )}
          <button
            type="button"
            title="Excluir áudio"
            className={iconButton}
            onClick={() => {
              if (window.confirm(`Excluir o áudio "${audio.title}"?`)) run(() => deleteAudio(audio.id));
            }}
          >
            <span className="material-symbols-outlined text-[18px]">delete_outline</span>
          </button>
        </div>
      </div>

      {audio.status === 'erro' && (
        <div role="alert" className="text-xs text-on-error-container bg-error-container/40 rounded-lg p-2.5 flex items-center justify-between gap-3">
          <span>{audio.errorMessage ?? 'A transcrição falhou.'}</span>
          {audio.canRetry && (
            <button type="button" onClick={() => run(() => retryAudio(audio.id))} className={linkButton}>
              Tentar novamente
            </button>
          )}
        </div>
      )}

      <audio
        ref={audioRef}
        src={audio.url}
        controls
        preload="metadata"
        onTimeUpdate={(e) => setCurrentSec(e.currentTarget.currentTime)}
        aria-label={`Reproduzir ${audio.title}`}
        className="w-full h-9"
      />

      {isExpanded && audio.status === 'concluido' && (
        <Transcript audioId={audio.id} currentSec={currentSec} onSeek={handleSeek} showToast={showToast} />
      )}
    </div>
  );
};

// -- Documento -----------------------------------------------------------------
const DocumentCard: React.FC<{ document: DocumentSource } & SourceActionsProps> = ({ document, showToast, onChanged }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: text, isPending, error } = useQuery({
    queryKey: ['documento-conteudo', document.id],
    queryFn: () => getDocumentText(document.id),
    enabled: isExpanded,
  });

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      await onChanged();
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  };

  return (
    <div data-testid="document-card" className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-3 border border-outline-variant/20 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="material-symbols-outlined text-primary text-[24px] shrink-0">
            {document.isSpreadsheet ? 'table_chart' : 'description'}
          </span>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-on-surface truncate">{document.title}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <SourceBadge status={document.status} label={document.statusLabel} />
              {document.pageCount !== null && (
                <span className="text-[11px] text-on-surface-variant">{document.pageCount} página(s)</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {document.status === 'concluido' && (
            <button type="button" onClick={() => setIsExpanded(!isExpanded)} className={linkButton}>
              <span className="material-symbols-outlined text-[16px]">{isExpanded ? 'visibility_off' : 'visibility'}</span>
              <span>{isExpanded ? 'Fechar texto' : 'Ver texto completo'}</span>
            </button>
          )}
          <button
            type="button"
            title="Excluir documento"
            className={iconButton}
            onClick={() => {
              if (window.confirm(`Excluir o documento "${document.title}"?`)) run(() => deleteDocument(document.id));
            }}
          >
            <span className="material-symbols-outlined text-[18px]">delete_outline</span>
          </button>
        </div>
      </div>

      {document.status === 'erro' && (
        <div role="alert" className="text-xs text-on-error-container bg-error-container/40 rounded-lg p-2.5 flex items-center justify-between gap-3">
          <span>{document.errorMessage ?? 'A leitura do documento falhou.'}</span>
          {document.canRetry && (
            <button type="button" onClick={() => run(() => retryDocument(document.id))} className={linkButton}>
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {isExpanded && (
        <div className="p-3 rounded-lg bg-white text-on-surface-variant text-xs leading-relaxed border border-outline-variant/20 max-h-56 overflow-y-auto whitespace-pre-wrap">
          {isPending ? 'Carregando texto...' : error ? errorMessage(error) : text || 'Nenhum texto foi extraído deste arquivo.'}
        </div>
      )}
    </div>
  );
};

// -- Tela ------------------------------------------------------------------------
interface ProjetoScreenProps {
  project: Project;
  initialSubTab?: 'ingestao' | 'fontes';
  stagedFiles: StagedFile[];
  onStagedFilesChange: (files: StagedFile[]) => void;
  onNavigate: (screen: ScreenType) => void;
  showToast: (msg: string, icon?: string) => void;
}

const stageFile = (file: File, isAudio: boolean): StagedFile => {
  const isSpreadsheet = /\.xlsx?$/i.test(file.name);
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    file,
    type: isAudio ? 'audio' : isSpreadsheet ? 'spreadsheet' : 'pdf',
    typeLabel: isAudio ? 'Áudio de Reunião' : isSpreadsheet ? 'Planilha' : 'Documento',
  };
};

export const ProjetoScreen: React.FC<ProjetoScreenProps> = ({
  project,
  initialSubTab = 'ingestao',
  stagedFiles,
  onStagedFilesChange,
  onNavigate,
  showToast,
}) => {
  const queryClient = useQueryClient();
  const audioInput = useRef<HTMLInputElement>(null);
  const documentInput = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStartingJob, setIsStartingJob] = useState(false);

  const audiosQuery = useAudios(project.id);
  const documentsQuery = useDocuments(project.id);
  const { data: jobs = [] } = useJobs(project.id);
  const { data: stories = [] } = useStories(project.id);
  const audios = audiosQuery.data ?? [];
  const documents = documentsQuery.data ?? [];

  const refreshSources = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: audiosKey(project.id) }),
      queryClient.invalidateQueries({ queryKey: documentsKey(project.id) }),
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY }),
    ]);
  };

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>, isAudio: boolean) => {
    const maxMb = isAudio ? MAX_AUDIO_MB : MAX_DOCUMENT_MB;
    const selected = Array.from(e.target.files ?? []);
    e.target.value = '';
    const tooLarge = selected.filter((f) => f.size > maxMb * 1024 * 1024);
    if (tooLarge.length > 0) {
      showToast(`"${tooLarge[0].name}" passa do limite de ${maxMb} MB.`, 'warning');
    }
    const staged = selected.filter((f) => !tooLarge.includes(f)).map((f) => stageFile(f, isAudio));
    const known = new Set(stagedFiles.map((f) => f.id));
    onStagedFilesChange([...stagedFiles, ...staged.filter((f) => !known.has(f.id))]);
  };

  const handleProcessFiles = async () => {
    setIsProcessing(true);
    const remaining: StagedFile[] = [];
    let sent = 0;
    for (const staged of stagedFiles) {
      try {
        if (staged.type === 'audio') await uploadAudio(project.id, staged.file);
        else await uploadDocument(project.id, staged.file);
        sent += 1;
      } catch (e) {
        remaining.push({ ...staged, errorMessage: errorMessage(e) });
      }
    }
    onStagedFilesChange(remaining);
    await refreshSources();
    setIsProcessing(false);

    if (remaining.length > 0) {
      showToast(`${remaining.length} arquivo(s) não enviado(s). Veja o motivo na lista.`, 'error');
    }
    if (sent > 0) {
      if (remaining.length === 0) showToast(`${sent} arquivo(s) enviado(s). O processamento começou.`, 'task_alt');
      onNavigate('projeto-fontes');
    }
  };

  // Fontes ainda não usadas por nenhum job concluído
  const usedAudios = new Set(jobs.filter((j) => j.status === 'concluido').flatMap((j) => j.audioIds.map(String)));
  const usedDocuments = new Set(jobs.filter((j) => j.status === 'concluido').flatMap((j) => j.documentIds.map(String)));
  const readyAudios = audios.filter((a) => a.status === 'concluido').map((a) => a.id);
  const readyDocuments = documents.filter((d) => d.status === 'concluido').map((d) => d.id);
  const newAudios = readyAudios.filter((id) => !usedAudios.has(id));
  const newDocuments = readyDocuments.filter((id) => !usedDocuments.has(id));

  const processingCount =
    audios.filter((a) => isSourceActive(a.status)).length + documents.filter((d) => isSourceActive(d.status)).length;
  const hasStories = stories.length > 0;
  const hasInput = hasStories ? newAudios.length + newDocuments.length > 0 : readyAudios.length + readyDocuments.length > 0;
  const jobRunning = jobs.some(isJobActive);

  const handleStartJob = async () => {
    setIsStartingJob(true);
    try {
      if (hasStories) await startAnalysis(queryClient, project.id, newAudios, newDocuments);
      else await startGeneration(queryClient, project.id, readyAudios, readyDocuments);
      onNavigate('visao-geral');
    } catch (e) {
      showToast(errorMessage(e), 'error');
    } finally {
      setIsStartingJob(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {initialSubTab === 'ingestao' && (
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight">Criar Novas Tarefas do Sistema</h1>
            <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">
              Envie áudios de conversas ou documentos com explicações. O sistema vai ler tudo e organizar o que
              precisa ser desenvolvido de forma clara e sem complicação.
            </p>
          </div>

          <input ref={audioInput} data-testid="input-audio" type="file" multiple accept={AUDIO_ACCEPT} className="hidden" onChange={(e) => handleSelectFiles(e, true)} />
          <input ref={documentInput} data-testid="input-documento" type="file" multiple accept={DOCUMENT_ACCEPT} className="hidden" onChange={(e) => handleSelectFiles(e, false)} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between items-center text-center min-h-[300px] border border-outline-variant/30 hover:border-primary/40 group">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[32px]">mic</span>
                    </div>
                    <h3 className="text-base font-bold text-on-surface">Gravações de Áudio</h3>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                      Entrevistas, reuniões ou notas de voz (<span className="font-mono text-on-surface font-medium">.mp3, .wav, .m4a, .ogg, .flac, .webm, .mp4</span>)
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1 bg-surface-container-low px-2.5 py-1 rounded text-[11px] text-on-surface-variant font-medium">
                      <span className="material-symbols-outlined text-[14px] text-secondary">auto_awesome</span>
                      Transcrição com marcação de tempo
                    </div>
                  </div>
                  <div className="mt-4 w-full flex flex-col items-center gap-1.5">
                    <button onClick={() => audioInput.current?.click()} className="cursor-pointer w-full bg-secondary hover:bg-secondary-container text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition-all inline-flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      <span>Selecionar Áudios</span>
                    </button>
                    <span className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[14px]">speed</span>
                      Até {MAX_AUDIO_MB}MB por arquivo
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between items-center text-center min-h-[300px] border border-outline-variant/30 hover:border-primary/40 group">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-primary-fixed text-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[32px]">description</span>
                    </div>
                    <h3 className="text-base font-bold text-on-surface">Documentos</h3>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                      Manuais, regras de negócio e tabelas (<span className="font-mono text-on-surface font-medium">.pdf, .docx, .txt, .md, .xlsx</span>)
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1 bg-surface-container-low px-2.5 py-1 rounded text-[11px] text-on-surface-variant font-medium">
                      <span className="material-symbols-outlined text-[14px] text-primary">psychology</span>
                      Extração automática de requisitos e regras
                    </div>
                  </div>
                  <div className="mt-4 w-full flex flex-col items-center gap-1.5">
                    <button onClick={() => documentInput.current?.click()} className="cursor-pointer w-full bg-primary hover:bg-primary-container text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition-all inline-flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      <span>Selecionar Documentos</span>
                    </button>
                    <span className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[14px]">speed</span>
                      Até {MAX_DOCUMENT_MB}MB por arquivo
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-low rounded-xl p-4 flex items-start gap-3 shadow-xs border border-outline-variant/20">
                <div className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">Como o sistema lê seus arquivos</h4>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Os áudios são transformados em texto com marcação de tempo. O sistema analisa cada detalhe para
                    que você sempre saiba de qual conversa veio cada tarefa criada.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-white rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Lista de Arquivos</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <h3 className="text-base font-bold text-on-surface">Arquivos Prontos</h3>
                      <span className="text-xs bg-primary-fixed text-on-primary-fixed font-bold px-2 py-0.5 rounded-full">{stagedFiles.length}</span>
                    </div>
                  </div>
                  <button onClick={() => onStagedFilesChange([])} disabled={stagedFiles.length === 0 || isProcessing} className="text-xs text-on-surface-variant hover:text-error transition-colors disabled:opacity-40 cursor-pointer">
                    Limpar todos
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                  {stagedFiles.map((f) => (
                    <div key={f.id} className="p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex items-center justify-between group border border-outline-variant/20">
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          f.type === 'audio' ? 'bg-secondary-fixed text-secondary' : f.type === 'pdf' ? 'bg-primary-fixed text-primary' : 'bg-tertiary-fixed text-tertiary'
                        }`}>
                          <span className="material-symbols-outlined text-[20px]">
                            {f.type === 'audio' ? 'mic' : f.type === 'pdf' ? 'description' : 'table_chart'}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-on-surface truncate">{f.file.name}</span>
                          <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                            <span>{formatFileSize(f.file.size)}</span>
                            <span>•</span>
                            <span>{f.typeLabel}</span>
                          </div>
                          {f.errorMessage && <span role="alert" className="text-[11px] text-error mt-0.5">{f.errorMessage}</span>}
                        </div>
                      </div>
                      <button onClick={() => onStagedFilesChange(stagedFiles.filter((s) => s.id !== f.id))} disabled={isProcessing} className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors shrink-0 cursor-pointer" title="Remover arquivo">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}

                  {stagedFiles.length === 0 && (
                    <div className="py-8 text-center text-xs text-on-surface-variant bg-surface rounded-lg">
                      Nenhum arquivo na fila. Clique nos botões ao lado para adicionar áudios ou documentos.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-xs border border-outline-variant/30 flex items-center justify-end gap-4">
                <button onClick={handleProcessFiles} disabled={isProcessing || stagedFiles.length === 0} className="bg-primary hover:bg-primary-container text-white text-xs font-semibold px-6 py-3 rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer" id="submit-pipeline-btn">
                  {isProcessing ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Enviando arquivos...</span>
                    </>
                  ) : (
                    <>
                      <span>Ler Arquivos e Continuar</span>
                      <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {initialSubTab === 'fontes' && (
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight">Arquivos Compreendidos pelo Sistema</h1>
            <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">
              Veja abaixo as transcrições das conversas e documentos que serão usados para criar as User Stories do seu projeto.
            </p>
          </div>

          {(audiosQuery.isPending || documentsQuery.isPending) && (
            <p role="status" className="text-xs text-on-surface-variant text-center">Carregando fontes...</p>
          )}

          {(audiosQuery.error || documentsQuery.error) && (
            <p role="alert" className="text-xs text-error text-center">{errorMessage(audiosQuery.error ?? documentsQuery.error)}</p>
          )}

          {!audiosQuery.isPending && !documentsQuery.isPending && audios.length + documents.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-xs text-on-surface-variant shadow-xs border border-outline-variant/30 flex flex-col items-center gap-3">
              <span>Este projeto ainda não tem fontes. Adicione áudios ou documentos para começar.</span>
              <button onClick={() => onNavigate('projeto-ingestao')} className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-all shadow-xs cursor-pointer">
                Adicionar Fontes
              </button>
            </div>
          ) : (
            <>
              <div className="w-full bg-white rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 border border-outline-variant/30">
                <div role="status" aria-live="polite" className="flex items-center gap-2.5 text-on-surface">
                  <span className="material-symbols-outlined text-tertiary text-[22px]">{processingCount > 0 ? 'pending' : 'task_alt'}</span>
                  <span className="text-sm font-semibold">
                    {readyAudios.length} áudio(s) e {readyDocuments.length} documento(s) compreendidos
                    {processingCount > 0 && `; ${processingCount} em processamento`}.
                  </span>
                </div>
                <button
                  onClick={handleStartJob}
                  disabled={!hasInput || processingCount > 0 || jobRunning || isStartingJob}
                  title={hasStories && !hasInput ? 'Nenhuma fonte nova para analisar' : undefined}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-white px-5 py-2 rounded-lg text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <span>{hasStories ? 'Analisar Novas Fontes' : 'Criar Tarefas do Sistema'}</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-6 bg-white rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[22px]">graphic_eq</span>
                      <h2 className="text-base font-bold text-on-surface">Gravações de Áudio</h2>
                    </div>
                    <span className="text-xs bg-surface-container px-3 py-1 rounded-full text-on-surface-variant font-semibold">{audios.length} Gravações</span>
                  </div>
                  {audios.length === 0 && <p className="text-xs text-on-surface-variant text-center py-4">Nenhum áudio enviado.</p>}
                  {audios.map((audio) => (
                    <AudioCard key={audio.id} audio={audio} showToast={showToast} onChanged={refreshSources} />
                  ))}
                </div>

                <div className="lg:col-span-6 bg-white rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[22px]">description</span>
                      <h2 className="text-base font-bold text-on-surface">Documentos Lidos</h2>
                    </div>
                    <span className="text-xs bg-surface-container px-3 py-1 rounded-full text-on-surface-variant font-semibold">{documents.length} Arquivos</span>
                  </div>
                  {documents.length === 0 && <p className="text-xs text-on-surface-variant text-center py-4">Nenhum documento enviado.</p>}
                  {documents.map((document) => (
                    <DocumentCard key={document.id} document={document} showToast={showToast} onChanged={refreshSources} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
