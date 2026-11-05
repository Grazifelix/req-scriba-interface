import React, { useState } from 'react';
import { StagedFile, AudioSource, DocumentSource, ScreenType } from '../types.ts';

interface ProjetoScreenProps {
  initialSubTab?: 'ingestao' | 'fontes';
  stagedFiles: StagedFile[];
  audioSources: AudioSource[];
  documentSources: DocumentSource[];
  onRemoveStagedFile: (id: string) => void;
  onClearStagedFiles: () => void;
  onAddStagedFile: (file: StagedFile) => void;
  onFilesProcessed: (files: StagedFile[]) => void;
  onUpdateAudioSource?: (audio: AudioSource) => void;
  onNavigate: (screen: ScreenType) => void;
  showToast: (msg: string, icon?: string) => void;
}

const parseTimestampToSec = (ts: string): number => {
  const match = ts.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }
  return 0;
};

const formatSecToTimestamp = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const ProjetoScreen: React.FC<ProjetoScreenProps> = ({
  initialSubTab = 'ingestao',
  stagedFiles,
  audioSources,
  documentSources,
  onRemoveStagedFile,
  onClearStagedFiles,
  onAddStagedFile,
  onFilesProcessed,
  onUpdateAudioSource,
  onNavigate,
  showToast,
}) => {
  const subTab = initialSubTab;

  // Audio player playback & pointer state (in seconds)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioCurrentSec, setAudioCurrentSec] = useState<Record<string, number>>({
    'audio-01': 72, // 01:12
    'audio-02': 130, // 02:10
    'audio-03': 60, // 01:00
  });

  // Active dialogue index per audio (highlighted playing snippet)
  const [activeDialogue, setActiveDialogue] = useState<Record<string, number>>({
    'audio-01': 1,
    'audio-02': 1,
    'audio-03': 0,
  });

  // Expanded transcripts
  const [expandedTranscripts, setExpandedTranscripts] = useState<Record<string, boolean>>({
    'audio-01': true,
    'audio-02': false,
    'audio-03': false,
  });

  // Editing transcriptions state
  const [editingAudioId, setEditingAudioId] = useState<string | null>(null);
  const [draftDialogues, setDraftDialogues] = useState<Array<{ timestamp: string; speaker: string; text: string }>>([]);

  // Expanded documents
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({
    'doc-01': false,
    'doc-02': false,
  });

  // Loading state for "Ler Arquivos e Continuar"
  const [isProcessing, setIsProcessing] = useState(false);

  // Simulated audio playback ticker: increments second by second and auto-tracks active dialogue
  React.useEffect(() => {
    if (!playingAudioId) return;

    const interval = setInterval(() => {
      setAudioCurrentSec((prev) => {
        const current = prev[playingAudioId] || 0;
        const targetAudio = audioSources.find((a) => a.id === playingAudioId);
        const maxSec = targetAudio?.durationSec || 600;

        if (current >= maxSec) {
          setPlayingAudioId(null);
          return { ...prev, [playingAudioId]: 0 };
        }
        const nextSec = current + 1;

        if (targetAudio) {
          let matchingIdx = 0;
          for (let i = 0; i < targetAudio.dialogues.length; i++) {
            if (parseTimestampToSec(targetAudio.dialogues[i].timestamp) <= nextSec) {
              matchingIdx = i;
            } else {
              break;
            }
          }
          setActiveDialogue((dPrev) => ({ ...dPrev, [playingAudioId]: matchingIdx }));
        }

        return { ...prev, [playingAudioId]: nextSec };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [playingAudioId, audioSources]);

  const toggleAudio = (id: string) => {
    if (playingAudioId === id) {
      setPlayingAudioId(null);
      showToast('Áudio pausado.');
    } else {
      setPlayingAudioId(id);
      showToast('Reproduzindo áudio...', 'play_arrow');
    }
  };

  const toggleTranscript = (id: string) => {
    setExpandedTranscripts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleJumpToDialogue = (
    audio: AudioSource,
    diag: { timestamp: string; speaker: string; text: string },
    dIdx: number
  ) => {
    const sec = parseTimestampToSec(diag.timestamp);
    setAudioCurrentSec((prev) => ({
      ...prev,
      [audio.id]: sec,
    }));
    setActiveDialogue((prev) => ({
      ...prev,
      [audio.id]: dIdx,
    }));
    setPlayingAudioId(audio.id);
    showToast(`Ponteiro reposicionado para ${diag.timestamp} (${diag.speaker})`, 'play_circle');
  };

  const handleStartEditTranscript = (audio: AudioSource) => {
    setEditingAudioId(audio.id);
    setDraftDialogues(audio.dialogues.map((d) => ({ ...d })));
    setExpandedTranscripts((prev) => ({ ...prev, [audio.id]: true }));
  };

  const handleCancelEditTranscript = () => {
    setEditingAudioId(null);
    setDraftDialogues([]);
  };

  const handleSaveTranscript = (audio: AudioSource) => {
    if (draftDialogues.length === 0) {
      showToast('A transcrição precisa conter pelo menos um trecho/fala.', 'warning');
      return;
    }

    if (onUpdateAudioSource) {
      onUpdateAudioSource({
        ...audio,
        dialogues: draftDialogues,
      });
    }
    setEditingAudioId(null);
    showToast(`Transcrição de "${audio.title}" salva com sucesso!`, 'check_circle');
  };

  const handleAddDialogueDraft = () => {
    const curSec = audioCurrentSec[editingAudioId || ''] || 0;
    const curTs = formatSecToTimestamp(curSec);
    setDraftDialogues((prev) => [
      ...prev,
      {
        timestamp: curTs,
        speaker: 'Mariana (Gerente do Projeto)',
        text: 'Novo trecho adicionado à transcrição...',
      },
    ]);
  };

  const handleRemoveDialogueDraft = (index: number) => {
    setDraftDialogues((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateDialogueField = (
    index: number,
    field: 'timestamp' | 'speaker' | 'text',
    value: string
  ) => {
    setDraftDialogues((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const toggleDoc = (id: string) => {
    setExpandedDocs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSimulateFileUpload = (type: 'audio' | 'pdf' | 'spreadsheet') => {
    const fileId = `file-${Date.now()}`;
    let newFile: StagedFile;

    if (type === 'audio') {
      newFile = {
        id: fileId,
        name: `Gravacao_Entrevista_${Date.now().toString().slice(-4)}.m4a`,
        size: '8.4 MB',
        type: 'audio',
        typeLabel: 'Áudio de Reunião',
        status: 'Pronto',
      };
    } else if (type === 'pdf') {
      newFile = {
        id: fileId,
        name: `Especificacao_Requisitos_${Date.now().toString().slice(-4)}.pdf`,
        size: '1.9 MB',
        type: 'pdf',
        typeLabel: 'Documento',
        status: 'Pronto',
      };
    } else {
      newFile = {
        id: fileId,
        name: `Matriz_Rastreabilidade_${Date.now().toString().slice(-4)}.xlsx`,
        size: '620 KB',
        type: 'spreadsheet',
        typeLabel: 'Planilha',
        status: 'Pronto',
      };
    }

    onAddStagedFile(newFile);
    showToast(`Arquivo "${newFile.name}" adicionado à fila!`, 'upload');
  };

  const handleProcessFiles = () => {
    setIsProcessing(true);
    const fileCount = stagedFiles.length;
    showToast('Lendo áudios e documentos via IA...', 'sync');

    setTimeout(() => {
      setIsProcessing(false);
      onFilesProcessed(stagedFiles);
      onNavigate('projeto-fontes');
      showToast(
        fileCount === 1 ? '1 arquivo da fila lido com sucesso!' : `${fileCount} arquivos da fila lidos com sucesso!`,
        'task_alt'
      );
    }, 1200);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">

      {/* ===================== SUBTAB 1: INGESTÃO DE DADOS ===================== */}
      {subTab === 'ingestao' && (
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight">
              Criar Novas Tarefas do Sistema
            </h1>
            <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">
              Envie áudios de conversas ou documentos com explicações. O sistema vai ler tudo e organizar o que
              precisa ser desenvolvido de forma clara e sem complicação.
            </p>
          </div>

          {/* Main 2-Column Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Dropzones & Guidance (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Audio Upload Dropzone */}
                <div className="bg-white rounded-xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between items-center text-center min-h-[300px] border border-outline-variant/30 hover:border-primary/40 group">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[32px]">mic</span>
                    </div>
                    <h3 className="text-base font-bold text-on-surface">Gravações de Áudio</h3>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                      Entrevistas, reuniões ou notas de voz (<span className="font-mono text-on-surface font-medium">.mp3, .wav, .m4a</span>)
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1 bg-surface-container-low px-2.5 py-1 rounded text-[11px] text-on-surface-variant font-medium">
                      <span className="material-symbols-outlined text-[14px] text-secondary">auto_awesome</span>
                      Transcrição e identificação de falas
                    </div>
                  </div>

                  <div className="mt-4 w-full flex flex-col items-center gap-1.5">
                    <button
                      onClick={() => handleSimulateFileUpload('audio')}
                      className="cursor-pointer w-full bg-secondary hover:bg-secondary-container text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition-all inline-flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      <span>Selecionar Áudios</span>
                    </button>
                    <span className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[14px]">speed</span>
                      Até 120MB por arquivo
                    </span>
                  </div>
                </div>

                {/* Documents Upload Dropzone */}
                <div className="bg-white rounded-xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between items-center text-center min-h-[300px] border border-outline-variant/30 hover:border-primary/40 group">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-primary-fixed text-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[32px]">description</span>
                    </div>
                    <h3 className="text-base font-bold text-on-surface">Documentos</h3>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                      Manuais, regras de negócio e tabelas (<span className="font-mono text-on-surface font-medium">.pdf, .docx, .xlsx</span>)
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1 bg-surface-container-low px-2.5 py-1 rounded text-[11px] text-on-surface-variant font-medium">
                      <span className="material-symbols-outlined text-[14px] text-primary">psychology</span>
                      Extração automática de requisitos e regras
                    </div>
                  </div>

                  <div className="mt-4 w-full flex flex-col items-center gap-1.5">
                    <button
                      onClick={() => handleSimulateFileUpload('pdf')}
                      className="cursor-pointer w-full bg-primary hover:bg-primary-container text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition-all inline-flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      <span>Selecionar Documentos</span>
                    </button>
                    <span className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[14px]">speed</span>
                      Até 50MB por arquivo
                    </span>
                  </div>
                </div>
              </div>

              {/* Informative Guidance Card */}
              <div className="bg-surface-container-low rounded-xl p-4 flex items-start gap-3 shadow-xs border border-outline-variant/20">
                <div className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">Como o sistema lê seus arquivos</h4>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Os áudios são transformados em texto identificando quem falou o quê. O sistema analisa cada
                    detalhe para que você sempre saiba de qual conversa veio cada tarefa criada.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Staged Files & Action (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-white rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
                      Lista de Arquivos
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <h3 className="text-base font-bold text-on-surface">Arquivos Prontos</h3>
                      <span className="text-xs bg-primary-fixed text-on-primary-fixed font-bold px-2 py-0.5 rounded-full">
                        {stagedFiles.length}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={onClearStagedFiles}
                    disabled={stagedFiles.length === 0}
                    className="text-xs text-on-surface-variant hover:text-error transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    Limpar todos
                  </button>
                </div>

                {/* Staged list */}
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                  {stagedFiles.map((f) => (
                    <div
                      key={f.id}
                      className="p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex items-center justify-between group border border-outline-variant/20"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            f.type === 'audio'
                              ? 'bg-secondary-fixed text-secondary'
                              : f.type === 'pdf'
                              ? 'bg-primary-fixed text-primary'
                              : 'bg-tertiary-fixed text-tertiary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {f.type === 'audio'
                              ? 'mic'
                              : f.type === 'pdf'
                              ? 'description'
                              : 'table_chart'}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-on-surface truncate">
                            {f.name}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                            <span>{f.size}</span>
                            <span>•</span>
                            <span>{f.typeLabel}</span>
                            <span>•</span>
                            <span className="text-tertiary font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-tertiary inline-block"></span>
                              Pronto
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onRemoveStagedFile(f.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors shrink-0"
                        title="Remover arquivo"
                      >
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

                {/* Storage Gauge */}
                <div className="pt-2 border-t border-outline-variant/20 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs text-on-surface-variant">
                    <span>Espaço reservado</span>
                    <span className="font-semibold text-on-surface">17.44 MB / 500 MB</span>
                  </div>
                  <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: '3.5%' }}></div>
                  </div>
                </div>
              </div>

              {/* Action Card Footer */}
              <div className="bg-white rounded-xl p-4 shadow-xs border border-outline-variant/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-tertiary">
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                  <span>Tudo pronto</span>
                </div>

                <button
                  onClick={handleProcessFiles}
                  disabled={isProcessing || stagedFiles.length === 0}
                  className="bg-primary hover:bg-primary-container text-white text-xs font-semibold px-6 py-3 rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
                  id="submit-pipeline-btn"
                >
                  {isProcessing ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Lendo arquivos e preparando tarefas...</span>
                    </>
                  ) : (
                    <>
                      <span>Ler Arquivos e Continuar</span>
                      <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SUBTAB 2: FONTES DE DADOS ===================== */}
      {subTab === 'fontes' && (
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight">
              Arquivos Compreendidos pelo Sistema
            </h1>
            <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">
              Veja abaixo as transcrições das conversas e documentos que serão usados para criar as User
              Stories do seu projeto.
            </p>
          </div>

          {audioSources.length + documentSources.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-xs text-on-surface-variant shadow-xs border border-outline-variant/30 flex flex-col items-center gap-3">
              <span>Este projeto ainda não tem fontes. Adicione áudios ou documentos para começar.</span>
              <button
                onClick={() => onNavigate('projeto-ingestao')}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                Adicionar Fontes
              </button>
            </div>
          ) : (
          <>
          {/* Success Banner */}
          <div className="w-full bg-white rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 border border-outline-variant/30">
            <div className="flex items-center gap-2.5 text-on-surface">
              <span className="material-symbols-outlined text-tertiary text-[22px]">task_alt</span>
              <span className="text-sm font-semibold">
                {audioSources.length === 1 ? '1 áudio de conversa' : `${audioSources.length} áudios de conversa`} e{' '}
                {documentSources.length === 1 ? '1 documento' : `${documentSources.length} documentos`}{' '}
                {audioSources.length + documentSources.length === 1 ? 'foi compreendido' : 'foram compreendidos'} com sucesso.
              </span>
            </div>
            <button
              onClick={() => onNavigate('visao-geral')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-white px-5 py-2 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              <span>Criar Tarefas do Sistema</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          {/* 2-Column Split: Left (Audio Recordings) + Right (Extracted Documents) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Audio Recordings */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="bg-white rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">graphic_eq</span>
                    <h2 className="text-base font-bold text-on-surface">Gravações de Áudio</h2>
                  </div>
                  <span className="text-xs bg-surface-container px-3 py-1 rounded-full text-on-surface-variant font-semibold">
                    {audioSources.length} Gravações Disponíveis
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  {audioSources.map((audio) => {
                    const isPlaying = playingAudioId === audio.id;
                    const currentSec = audioCurrentSec[audio.id] || 0;
                    const maxSec = audio.durationSec || 600;
                    const progressPct = Math.min(100, Math.max(0, (currentSec / maxSec) * 100));
                    const isExpanded = expandedTranscripts[audio.id];
                    const isEditingThis = editingAudioId === audio.id;
                    const currentActiveIdx = activeDialogue[audio.id];

                    return (
                      <div
                        key={audio.id}
                        className="bg-surface-container-low rounded-xl border border-outline-variant/20 overflow-hidden transition-all shadow-xs"
                      >
                        <div className="p-4 flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 text-primary shadow-xs">
                                <span className="material-symbols-outlined text-[20px]">mic</span>
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-xs font-bold text-on-surface leading-tight">
                                  {audio.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[11px] bg-surface-container-highest px-2 py-0.5 rounded text-on-surface-variant font-medium">
                                    {audio.durationLabel}
                                  </span>
                                  <span className="text-[11px] bg-tertiary-fixed text-on-tertiary-fixed-variant px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                                    {audio.status}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => toggleTranscript(audio.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-surface-container border border-outline-variant/20 text-primary text-xs font-semibold transition-colors shadow-xs shrink-0 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">format_quote</span>
                              <span className="hidden sm:inline">
                                {isExpanded ? 'Recolher transcrição' : 'Ver transcrição'}
                              </span>
                              <span
                                className={`material-symbols-outlined text-[16px] transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              >
                                expand_more
                              </span>
                            </button>
                          </div>

                          {/* Audio Player Scrubber Bar with Visible Playhead Pointer */}
                          <div className="bg-white rounded-lg p-3 flex items-center gap-3 border border-outline-variant/20 shadow-xs">
                            <button
                              onClick={() => toggleAudio(audio.id)}
                              className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-container transition-colors shrink-0 shadow-xs cursor-pointer"
                              title={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                {isPlaying ? 'pause' : 'play_arrow'}
                              </span>
                            </button>

                            <div className="flex-1 flex flex-col gap-1.5">
                              <div className="flex justify-between items-center text-on-surface-variant text-[11px] font-mono">
                                <span className="font-bold text-primary flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                                  {formatSecToTimestamp(currentSec)}
                                </span>
                                <span className="text-[10px] text-on-surface-variant font-medium">
                                  {audio.durationLabel}
                                </span>
                              </div>

                              {/* Interactive Scrubber with Playhead Pointer */}
                              <div
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                                  const pct = clickX / rect.width;
                                  const newSec = Math.round(pct * maxSec);
                                  setAudioCurrentSec((prev) => ({ ...prev, [audio.id]: newSec }));
                                  showToast(`Ponteiro reposicionado para ${formatSecToTimestamp(newSec)}`, 'schedule');
                                }}
                                className="relative w-full h-3 bg-surface-container-highest rounded-full cursor-pointer flex items-center group/track"
                                title="Clique no scrubber para reposicionar o ponteiro do áudio"
                              >
                                {/* Progress Fill */}
                                <div
                                  className="h-full bg-primary rounded-full transition-all duration-150"
                                  style={{ width: `${progressPct}%` }}
                                ></div>

                                {/* Playhead Pointer Pin */}
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full shadow-md transition-all duration-150 group-hover/track:scale-125 flex items-center justify-center pointer-events-none"
                                  style={{ left: `${progressPct}%` }}
                                >
                                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 text-on-surface-variant shrink-0">
                              <span className="material-symbols-outlined text-[18px]">volume_up</span>
                            </div>
                          </div>
                        </div>

                        {/* Collapsible Transcript Content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 border-t border-outline-variant/20 flex flex-col gap-3">
                            <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-primary">transcribe</span>
                                <span className="text-xs text-on-surface font-bold">
                                  {isEditingThis ? 'Editando Transcrição de Áudio' : 'Transcrição com Oradores'}
                                </span>
                                <span className="text-[11px] text-on-surface-variant">
                                  ({audio.dialogues.length} falas)
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {!isEditingThis ? (
                                  <button
                                    onClick={() => handleStartEditTranscript(audio)}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white hover:bg-surface-container border border-outline-variant/30 text-primary text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                                    title="Editar oradores e texto da transcrição"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">edit</span>
                                    <span>Editar Transcrição</span>
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={handleCancelEditTranscript}
                                      className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-on-surface-variant text-xs font-semibold transition-colors cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      onClick={() => handleSaveTranscript(audio)}
                                      className="inline-flex items-center gap-1 px-3.5 py-1 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-[15px]">check</span>
                                      <span>Salvar Transcrição</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Info Hint Banner */}
                            <div className="p-2 bg-primary-fixed/20 border border-primary/20 rounded-lg flex items-center justify-between text-[11px] text-primary gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px]">touch_app</span>
                                <span>
                                  {isEditingThis
                                    ? 'Modifique oradores, timestamps e o texto abaixo. Clique em "+ Adicionar Trecho" para nova fala.'
                                    : 'Clique em qualquer trecho da conversa para reposicionar o ponteiro do áudio e ouvir a partir dele.'}
                                </span>
                              </div>
                            </div>

                            {/* Normal View: Clickable Snippets that reposition the audio playhead */}
                            {!isEditingThis && (
                              <div className="rounded-lg text-xs leading-relaxed space-y-2 max-h-72 overflow-y-auto pr-1">
                                {audio.dialogues.map((diag, dIdx) => {
                                  const isActive = currentActiveIdx === dIdx;
                                  return (
                                    <div
                                      key={dIdx}
                                      onClick={() => handleJumpToDialogue(audio, diag, dIdx)}
                                      className={`p-3 rounded-xl border transition-all cursor-pointer group flex flex-col gap-1.5 ${
                                        isActive
                                          ? 'bg-primary-fixed/30 border-primary/50 shadow-xs ring-1 ring-primary/20'
                                          : 'bg-white border-outline-variant/20 hover:border-primary/30 hover:bg-surface-container-low'
                                      }`}
                                      title="Clique para reposicionar o ponteiro do áudio nesta fala"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded transition-colors ${
                                              isActive
                                                ? 'bg-primary text-white shadow-2xs'
                                                : 'bg-surface-container text-primary group-hover:bg-primary group-hover:text-white'
                                            }`}
                                          >
                                            <span className="material-symbols-outlined text-[13px]">
                                              {isActive && isPlaying ? 'equalizer' : 'play_arrow'}
                                            </span>
                                            [{diag.timestamp}]
                                          </span>
                                          <strong className="text-xs text-on-surface font-semibold">
                                            {diag.speaker}
                                          </strong>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          {isActive && (
                                            <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 shadow-2xs">
                                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                                              Ponteiro nesta fala
                                            </span>
                                          )}
                                          <span className="text-[11px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                            <span className="material-symbols-outlined text-[14px]">play_circle</span>
                                            Ouvir trecho
                                          </span>
                                        </div>
                                      </div>

                                      <p className="text-xs text-on-surface-variant leading-relaxed pl-1">
                                        {diag.text}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Edit Mode: Editable Fields for Timestamps, Speakers & Dialogue Text */}
                            {isEditingThis && (
                              <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                                {draftDialogues.map((diag, dIdx) => (
                                  <div
                                    key={dIdx}
                                    className="p-3 bg-white rounded-xl border border-outline-variant/30 flex flex-col gap-2 shadow-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[11px] font-semibold text-on-surface-variant">Tempo:</span>
                                        <input
                                          type="text"
                                          value={diag.timestamp}
                                          onChange={(e) =>
                                            handleUpdateDialogueField(dIdx, 'timestamp', e.target.value)
                                          }
                                          placeholder="00:00"
                                          className="w-20 px-2 py-1 font-mono text-xs bg-surface border border-outline-variant/30 rounded focus:outline-none focus:ring-1 focus:ring-primary/40 font-bold text-primary"
                                        />
                                      </div>

                                      <div className="flex-1 flex items-center gap-1">
                                        <span className="text-[11px] font-semibold text-on-surface-variant">Orador:</span>
                                        <input
                                          type="text"
                                          value={diag.speaker}
                                          onChange={(e) =>
                                            handleUpdateDialogueField(dIdx, 'speaker', e.target.value)
                                          }
                                          placeholder="Nome do orador..."
                                          className="flex-1 px-2.5 py-1 text-xs bg-surface border border-outline-variant/30 rounded focus:outline-none focus:ring-1 focus:ring-primary/40 text-on-surface font-semibold"
                                        />
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleRemoveDialogueDraft(dIdx)}
                                        title="Excluir este trecho"
                                        className="p-1 rounded text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">delete_outline</span>
                                      </button>
                                    </div>

                                    <textarea
                                      value={diag.text}
                                      onChange={(e) =>
                                        handleUpdateDialogueField(dIdx, 'text', e.target.value)
                                      }
                                      rows={2}
                                      placeholder="Texto falado neste trecho..."
                                      className="w-full p-2.5 text-xs bg-surface border border-outline-variant/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 text-on-surface resize-none leading-relaxed"
                                    />
                                  </div>
                                ))}

                                <button
                                  type="button"
                                  onClick={handleAddDialogueDraft}
                                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-outline-variant/40 hover:border-primary text-primary hover:bg-primary/5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[16px]">add</span>
                                  <span>Adicionar Novo Trecho / Fala</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Document Sources */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="bg-white rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">description</span>
                    <h2 className="text-base font-bold text-on-surface">Documentos Lidos</h2>
                  </div>
                  <span className="text-xs bg-surface-container px-3 py-1 rounded-full text-on-surface-variant font-semibold">
                    {documentSources.length} Arquivos Conectados
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  {documentSources.map((doc) => {
                    const isExpanded = expandedDocs[doc.id];

                    return (
                      <div
                        key={doc.id}
                        className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-3 transition-all border border-outline-variant/20 shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="material-symbols-outlined text-primary text-[24px] shrink-0">
                              {doc.type === 'pdf' ? 'picture_as_pdf' : 'table_chart'}
                            </span>
                            <div className="truncate">
                              <h3 className="text-xs font-bold text-on-surface truncate">{doc.title}</h3>
                              <span className="text-[11px] text-on-surface-variant">{doc.category}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => toggleDoc(doc.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-surface-container border border-outline-variant/20 text-primary text-xs font-semibold transition-colors shadow-xs shrink-0 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {isExpanded ? 'visibility_off' : 'visibility'}
                            </span>
                            <span>{isExpanded ? 'Fechar texto' : 'Ver texto completo'}</span>
                          </button>
                        </div>

                        {/* Expandable Document Text Drawer */}
                        {isExpanded && (
                          <div className="mt-1 pt-3 border-t border-outline-variant/20 flex flex-col gap-2">
                            <div className="flex items-center justify-between pb-1">
                              <span className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">article</span>
                                Texto extraído do arquivo
                              </span>
                              <span className="text-[11px] text-primary bg-primary-fixed/30 px-2 py-0.5 rounded font-semibold">
                                {doc.readPercentage}
                              </span>
                            </div>

                            <div className="p-3 rounded-lg bg-white text-on-surface-variant text-xs leading-relaxed space-y-2 border border-outline-variant/20 max-h-56 overflow-y-auto">
                              {doc.sections.map((sec, sIdx) => (
                                <div key={sIdx} className="space-y-1">
                                  <h4 className="font-bold text-on-surface text-xs">{sec.heading}</h4>
                                  {sec.content.map((p, pIdx) => (
                                    <p key={pIdx} className="text-on-surface-variant text-xs pl-2 border-l border-primary/30">
                                      {p}
                                    </p>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          </>
          )}
        </div>
      )}
    </div>
  );
};
