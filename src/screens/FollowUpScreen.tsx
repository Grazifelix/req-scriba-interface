import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../api/client.ts';
import {
  answerQuestion,
  approveQuestion,
  deleteQuestion,
  editQuestion,
  generateQuestions,
  questionsKey,
  useQuestions,
} from '../api/questions.ts';
import { useStories } from '../api/stories.ts';
import { Project, ScreenType } from '../types.ts';

interface FollowUpScreenProps {
  project: Project;
  onOpenStory: (storyId: string) => void;
  onNavigate: (screen: ScreenType) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const FollowUpScreen: React.FC<FollowUpScreenProps> = ({ project, onOpenStory, onNavigate, showToast }) => {
  const queryClient = useQueryClient();
  const { data: allQuestions = [], isPending, error } = useQuestions(project.id);
  const { data: stories = [] } = useStories(project.id);
  const [filter, setFilter] = useState<'all' | 'Pendente' | 'Aprovada' | 'Respondida'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [generateStoryId, setGenerateStoryId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [limitations, setLimitations] = useState<string[]>([]);

  const hasSources = project.audiosCount + project.docsCount > 0;
  const questions = allQuestions.filter((q) => q.status !== 'Rejeitada');
  const pendingCount = questions.filter((q) => q.status === 'Pendente').length;
  const approvedQuestions = questions.filter((q) => q.status === 'Aprovada');
  const answeredCount = questions.filter((q) => q.status === 'Respondida').length;

  const search = searchQuery.toLowerCase();
  const filteredQuestions = questions.filter((q) => {
    const matchesFilter = filter === 'all' || q.status === filter;
    return matchesFilter && [q.question, q.storyCode, q.storyTitle].some((text) => text.toLowerCase().includes(search));
  });

  const runChange = async (change: () => Promise<unknown>, successMessage: string): Promise<boolean> => {
    setIsSaving(true);
    try {
      await change();
      await queryClient.invalidateQueries({ queryKey: questionsKey(project.id) });
      showToast(successMessage);
      return true;
    } catch (e) {
      showToast(errorMessage(e), 'error');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim()) return;
    if (await runChange(() => editQuestion(id, editText.trim()), 'Pergunta atualizada com sucesso!')) setEditingId(null);
  };

  const handleSaveAnswer = async (id: string) => {
    if (!answerText.trim()) return;
    if (await runChange(() => answerQuestion(id, answerText.trim()), 'Resposta registrada.')) {
      setAnsweringId(null);
      setAnswerText('');
    }
  };

  const buildScript = () => approvedQuestions.map((q, i) => `${i + 1}. (${q.storyCode}): ${q.question}`);

  const handleCopyScript = () => {
    const formatted = `ROTEIRO DE REUNIÃO - FOLLOW-UP:\n${buildScript().join('\n\n')}`;
    const copyFailed = () => showToast('Não foi possível copiar as perguntas. Use "Exportar Lista".', 'error');
    if (!navigator.clipboard) {
      copyFailed();
      return;
    }
    navigator.clipboard
      .writeText(formatted)
      .then(() => showToast('Perguntas do roteiro copiadas para a área de transferência!', 'content_copy'))
      .catch(copyFailed);
  };

  const handleExportList = () => {
    const blob = new Blob([buildScript().join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roteiro_reuniao_follow_up.txt';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Roteiro da reunião exportado com sucesso!', 'download');
  };

  const handleGenerate = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const storyId = generateStoryId || stories[0]?.id;
    if (!storyId) return;
    setIsGenerating(true);
    setLimitations([]);
    try {
      const result = await generateQuestions(storyId);
      await queryClient.invalidateQueries({ queryKey: questionsKey(project.id) });
      setLimitations(result.limitations);
      setModalOpen(false);
      showToast(result.total > 0 ? `${result.total} pergunta(s) criada(s).` : 'Nenhuma pergunta foi gerada. Veja o motivo na tela.', result.total > 0 ? 'auto_awesome' : 'info');
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const filterButton = (value: typeof filter, label: string, inactiveColor: string) => (
    <button
      onClick={() => setFilter(value)}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
        filter === value ? 'bg-primary text-white shadow-xs' : `bg-surface-container-low hover:bg-surface-container ${inactiveColor}`
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 bg-white p-6 rounded-xl shadow-xs border border-outline-variant/30">
        <div className="max-w-3xl flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-on-surface tracking-tight">Perguntas de Follow-Up</h1>
          <p className="text-sm text-on-surface-variant">Veja as dúvidas identificadas automaticamente e prepare as perguntas para a próxima conversa.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setGenerateStoryId(stories[0]?.id ?? '');
              setModalOpen(true);
            }}
            disabled={stories.length === 0 || isGenerating}
            title={stories.length === 0 ? 'Crie User Stories para gerar perguntas' : undefined}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary-container text-white text-xs font-semibold transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            <span>{isGenerating ? 'Gerando...' : 'Gerar Perguntas'}</span>
          </button>
          <button onClick={handleExportList} disabled={approvedQuestions.length === 0} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Exportar Roteiro</span>
          </button>
        </div>
      </div>

      {limitations.length > 0 && (
        <div role="status" className="p-4 bg-[#fffbeb] border border-[#fcd34d] rounded-xl text-xs text-[#92400e] flex flex-col gap-1">
          <strong>Limitações informadas pela IA:</strong>
          <ul className="list-disc pl-4">
            {limitations.map((limitation, i) => <li key={i}>{limitation}</li>)}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-xs flex items-center justify-between border-l-4 border-outline-variant">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-on-surface-variant">Pendentes de Revisão</span>
            <span className="text-3xl font-bold text-on-surface mt-1">{pendingCount}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-outline">
            <span className="material-symbols-outlined text-[22px]">hourglass_empty</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-xs flex items-center justify-between border-l-4 border-tertiary">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-tertiary">Aprovadas (Roteiro)</span>
            <span className="text-3xl font-bold text-tertiary mt-1">{approvedQuestions.length}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary">
            <span className="material-symbols-outlined text-[22px]">check_circle</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-xs flex items-center justify-between border-l-4 border-primary">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-primary">Respondidas</span>
            <span className="text-3xl font-bold text-primary mt-1">{answeredCount}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[22px]">task_alt</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-xs border border-outline-variant/30 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-on-surface-variant font-semibold mr-1">Filtrar:</span>
          {filterButton('all', `Todas (${questions.length})`, 'text-on-surface')}
          {filterButton('Pendente', `Pendentes (${pendingCount})`, 'text-on-surface')}
          {filterButton('Aprovada', `Aprovadas (${approvedQuestions.length})`, 'text-tertiary')}
          {filterButton('Respondida', `Respondidas (${answeredCount})`, 'text-primary')}
        </div>
        <div className="relative min-w-[260px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar pergunta ou tarefa..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface placeholder:text-on-surface-variant text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/30"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">checklist</span>
              <h2 className="text-xl font-bold text-on-surface">Perguntas Identificadas</h2>
            </div>
            <span className="text-xs font-medium text-on-surface-variant">{filteredQuestions.length} dúvidas listadas</span>
          </div>

          <div className="flex flex-col gap-4">
            {isPending && <p role="status" className="p-6 text-center text-xs text-on-surface-variant">Carregando perguntas...</p>}
            {error && <p role="alert" className="p-6 text-center text-xs text-error">{errorMessage(error)}</p>}

            {filteredQuestions.map((q) => {
              const isApproved = q.status === 'Aprovada';
              const isAnswered = q.status === 'Respondida';
              const isEditing = editingId === q.id;
              const isAnswering = answeringId === q.id;

              return (
                <div key={q.id} data-testid="question" className={`bg-white rounded-xl p-4 shadow-xs border-l-4 flex flex-col gap-3 transition-all ${isApproved ? 'border-tertiary' : isAnswered ? 'border-primary' : 'border-outline-variant'}`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-surface-container text-primary text-xs font-mono font-bold">{q.storyCode}</span>
                      <span className="text-sm font-bold text-on-surface">{q.storyTitle}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isApproved ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant' : isAnswered ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container text-on-surface-variant'
                    }`}>
                      <span className="material-symbols-outlined text-[14px]">{isApproved ? 'check' : isAnswered ? 'task_alt' : 'hourglass_empty'}</span>
                      {q.status}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="flex flex-col gap-2 pt-1">
                      <textarea
                        value={editText}
                        maxLength={1000}
                        aria-label="Editar pergunta"
                        onChange={(e) => setEditText(e.target.value)}
                        rows={2}
                        className="w-full p-2.5 text-xs bg-surface border border-primary/30 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditingId(null)} className="px-3 py-1 rounded text-xs text-on-surface-variant hover:bg-surface-container cursor-pointer">Cancelar</button>
                        <button onClick={() => handleSaveEdit(q.id)} disabled={isSaving} className="px-3 py-1 rounded bg-primary text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer">Salvar</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-on-surface font-medium pl-1 leading-relaxed">“{q.question}”</p>
                  )}

                  {q.note && !isEditing && (
                    <div className="text-xs text-on-surface-variant italic pl-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-amber-500">info</span>
                      <span>{q.note}</span>
                    </div>
                  )}

                  {q.answer && (
                    <div className="mt-1 p-2.5 rounded-lg bg-surface-container-low border border-primary/20 text-xs text-on-surface flex flex-col gap-1">
                      <span className="font-semibold text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">comment</span>
                        Resposta registrada:
                      </span>
                      <p className="leading-relaxed">{q.answer}</p>
                    </div>
                  )}

                  {isAnswering && (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={answerText}
                        maxLength={2000}
                        aria-label="Resposta da pergunta"
                        placeholder="O que foi respondido pelo stakeholder?"
                        onChange={(e) => setAnswerText(e.target.value)}
                        rows={2}
                        className="w-full p-2.5 text-xs bg-surface border border-primary/30 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setAnsweringId(null)} className="px-3 py-1 rounded text-xs text-on-surface-variant hover:bg-surface-container cursor-pointer">Cancelar</button>
                        <button onClick={() => handleSaveAnswer(q.id)} disabled={isSaving} className="px-3 py-1 rounded bg-primary text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer">Salvar Resposta</button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant/15 flex-wrap gap-2">
                    <button onClick={() => onOpenStory(q.storyId)} className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer">
                      <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                      Ver tarefa no backlog
                    </button>

                    <div className="flex items-center gap-2">
                      {!isEditing && !isAnswered && (
                        <button
                          onClick={() => {
                            setEditingId(q.id);
                            setEditText(q.question);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          Editar
                        </button>
                      )}
                      <button onClick={() => runChange(() => deleteQuestion(q.id), 'Pergunta removida.')} disabled={isSaving} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-error hover:bg-error-container/30 text-xs transition-colors disabled:opacity-50 cursor-pointer">
                        <span className="material-symbols-outlined text-[14px]">delete_outline</span>
                        Descartar
                      </button>
                      {q.status === 'Pendente' && (
                        <button onClick={() => runChange(() => approveQuestion(q.id), 'Pergunta aprovada para o roteiro da reunião!')} disabled={isSaving} className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold shadow-xs transition-all bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50 cursor-pointer">
                          <span className="material-symbols-outlined text-[14px]">check</span>
                          <span>Aprovar</span>
                        </button>
                      )}
                      {isApproved && !isAnswering && (
                        <button
                          onClick={() => {
                            setAnsweringId(q.id);
                            setAnswerText('');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold shadow-xs transition-all bg-tertiary text-on-tertiary cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">comment</span>
                          <span>Registrar Resposta</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {!isPending && !error && questions.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center text-xs text-on-surface-variant shadow-xs flex flex-col items-center gap-3">
                {hasSources ? (
                  <span>Nenhuma pergunta ainda. Avalie uma User Story e use "Gerar Perguntas".</span>
                ) : (
                  <>
                    <span>Este projeto ainda não tem perguntas. Adicione áudios ou documentos para identificá-las.</span>
                    <button onClick={() => onNavigate('projeto-ingestao')} className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-all shadow-xs cursor-pointer">
                      Adicionar Fontes
                    </button>
                  </>
                )}
              </div>
            )}

            {questions.length > 0 && filteredQuestions.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center text-xs text-on-surface-variant shadow-xs">Nenhuma pergunta encontrada para os filtros atuais.</div>
            )}
          </div>
        </div>

        <div className="xl:col-span-4 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-[22px]">format_list_bulleted</span>
              <h2 className="text-xl font-bold text-on-surface">Roteiro da Reunião</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant text-xs font-semibold">Perguntas Aprovadas</span>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col gap-4">
            <p className="text-xs text-on-surface-variant leading-relaxed">Itens selecionados para alinhar com o cliente e time técnico na próxima reunião:</p>

            <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
              {approvedQuestions.map((q, idx) => (
                <div key={q.id} className="bg-surface-container-low p-3.5 rounded-lg flex flex-col gap-1.5 border border-outline-variant/20">
                  <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-semibold">
                    <span>{q.storyCode}</span>
                    <span className="text-primary font-mono">Item #{idx + 1}</span>
                  </div>
                  <p className="text-xs text-on-surface font-medium leading-relaxed">{idx + 1}. {q.question}</p>
                </div>
              ))}
              {approvedQuestions.length === 0 && (
                <div className="p-6 text-center text-xs text-on-surface-variant bg-surface rounded-lg">
                  Nenhuma pergunta foi aprovada ainda. Aprove dúvidas na coluna ao lado para montar o roteiro!
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/20">
              <button onClick={handleCopyScript} disabled={approvedQuestions.length === 0} className="w-full py-2.5 rounded-lg bg-primary text-on-primary text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-xs hover:bg-primary-container active:scale-95 disabled:opacity-50 cursor-pointer" id="btn-copy-script">
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                <span>Copiar Perguntas</span>
              </button>
              <button onClick={handleExportList} disabled={approvedQuestions.length === 0} className="w-full py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-outline-variant/30 disabled:opacity-50 cursor-pointer">
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Exportar Lista</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#213145]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[24px]">quiz</span>
                <h2 className="text-lg font-bold text-on-surface">Gerar Perguntas</h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              As perguntas nascem dos defeitos encontrados na avaliação de qualidade. Avalie a User Story antes, se ainda não fez isso. A IA pode levar alguns minutos.
            </p>
            <form onSubmit={handleGenerate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="select-generate-story" className="text-xs font-semibold text-on-surface">User Story</label>
                <select
                  id="select-generate-story"
                  value={generateStoryId}
                  onChange={(e) => setGenerateStoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface rounded-lg text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/30"
                >
                  {stories.map((s) => (
                    <option key={s.id} value={s.id}>{s.code} - {s.title}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-container text-on-surface-variant text-xs font-semibold cursor-pointer">Cancelar</button>
                <button type="submit" disabled={isGenerating} className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer">
                  {isGenerating ? 'Gerando...' : 'Gerar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
