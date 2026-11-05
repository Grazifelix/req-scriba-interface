import React, { useState } from 'react';
import { FollowUpQuestion, ScreenType } from '../types.ts';

const GENERATED_QUESTION =
  'Qual será o comportamento esperado quando a câmera do celular estiver embaçada ou sem iluminação suficiente?';

interface FollowUpScreenProps {
  questions: FollowUpQuestion[];
  hasSources: boolean;
  onUpdateQuestion: (question: FollowUpQuestion) => void;
  onDeleteQuestion: (id: string) => void;
  onAddQuestion: (q: Omit<FollowUpQuestion, 'id'>) => void;
  onOpenStory: (storyId: string) => void;
  onNavigate: (screen: ScreenType) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const FollowUpScreen: React.FC<FollowUpScreenProps> = ({
  questions,
  hasSources,
  onUpdateQuestion,
  onDeleteQuestion,
  onAddQuestion,
  onOpenStory,
  onNavigate,
  showToast,
}) => {
  const [filter, setFilter] = useState<'all' | 'Pendente' | 'Aprovada' | 'Respondida'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // New Question Form state
  const [newStoryId, setNewStoryId] = useState('#US02');
  const [newStoryTitle, setNewStoryTitle] = useState('Exportação de Extrato em PDF/Excel');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newRole, setNewRole] = useState('PO Financeiro');
  const [newNote, setNewNote] = useState('');

  // Counts
  const pendingCount = questions.filter((q) => q.status === 'Pendente').length;
  const approvedCount = questions.filter((q) => q.status === 'Aprovada').length;
  const answeredCount = questions.filter((q) => q.status === 'Respondida').length;

  const filteredQuestions = questions.filter((q) => {
    const matchesFilter = filter === 'all' ? true : q.status === filter;
    const matchesSearch =
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.storyId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.storyTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const approvedQuestions = questions.filter((q) => q.status === 'Aprovada');

  const startEdit = (q: FollowUpQuestion) => {
    setEditingId(q.id);
    setEditText(q.question);
  };

  const saveEdit = (q: FollowUpQuestion) => {
    if (!editText.trim()) return;
    onUpdateQuestion({ ...q, question: editText.trim() });
    setEditingId(null);
    showToast('Pergunta atualizada com sucesso!');
  };

  const toggleStatus = (q: FollowUpQuestion) => {
    const nextStatus = q.status === 'Aprovada' ? 'Pendente' : 'Aprovada';
    onUpdateQuestion({ ...q, status: nextStatus });
    showToast(
      nextStatus === 'Aprovada'
        ? 'Pergunta aprovada para o roteiro da reunião!'
        : 'Pergunta retornou para revisão pendente.'
    );
  };

  const handleCopyScript = () => {
    const script = approvedQuestions
      .map(
        (q, index) =>
          `${index + 1}. (${q.storyId} - ${q.assignedRole || 'Equipe'}): ${q.question}`
      )
      .join('\n\n');

    const formatted = `ROTEIRO DE REUNIÃO - FOLLOW-UP:\n${script}`;
    const copyFailed = () => showToast('Não foi possível copiar as perguntas. Use "Exportar Lista".', 'error');
    if (!navigator.clipboard) {
      copyFailed();
      return;
    }
    navigator.clipboard.writeText(formatted).then(() => {
      showToast('Perguntas do roteiro copiadas para a área de transferência!', 'content_copy');
    }).catch(copyFailed);
  };

  const handleExportList = () => {
    const text = approvedQuestions
      .map((q, i) => `${i + 1}. [${q.storyId}] ${q.question} (Resp: ${q.assignedRole || 'Geral'})`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roteiro_reuniao_follow_up.txt';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Roteiro da reunião exportado com sucesso!', 'download');
  };

  const handleAutoGenerate = () => {
    if (questions.some((q) => q.question === GENERATED_QUESTION)) {
      showToast('Nenhuma nova dúvida encontrada nas fontes.', 'info');
      return;
    }
    setIsGenerating(true);
    showToast('Varrendo documentos e áudios em busca de novas lacunas...', 'sync');
    setTimeout(() => {
      setIsGenerating(false);
      onAddQuestion({
        storyId: '#US01',
        storyTitle: 'Autenticação Biométrica no login',
        question: GENERATED_QUESTION,
        status: 'Pendente',
        note: 'Detectado na transcrição: Carlos mencionou falha de leitura em ambientes escuros.',
        assignedRole: 'UX Mobile',
      });
      showToast('Nova dúvida de follow-up descoberta com sucesso!', 'auto_awesome');
    }, 1200);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    onAddQuestion({
      storyId: newStoryId,
      storyTitle: newStoryTitle,
      question: newQuestionText.trim(),
      status: 'Pendente',
      assignedRole: newRole,
      note: newNote.trim() || undefined,
    });

    setModalOpen(false);
    setNewQuestionText('');
    setNewNote('');
    showToast('Pergunta de follow-up adicionada!');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* Header & Hero Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 bg-white p-6 rounded-xl shadow-xs border border-outline-variant/30">
        <div className="max-w-3xl flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-on-surface tracking-tight">Perguntas de Follow-Up</h1>
          <p className="text-sm text-on-surface-variant">
            Veja as dúvidas identificadas automaticamente e prepare as perguntas para a próxima conversa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setModalOpen(true)}
            disabled={!hasSources}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-all active:scale-95 shadow-xs border border-outline-variant/30 disabled:opacity-50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-primary text-[18px]">add</span>
            <span>Nova Pergunta</span>
          </button>
          <button
            onClick={handleAutoGenerate}
            disabled={isGenerating || !hasSources}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary-container text-white text-xs font-semibold transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            <span>Gerar Perguntas</span>
          </button>
          <button
            onClick={handleExportList}
            disabled={approvedQuestions.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Exportar Roteiro</span>
          </button>
        </div>
      </div>

      {/* Metric Cards: Transparency and Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pending */}
        <div className="bg-white p-4 rounded-xl shadow-xs flex items-center justify-between border-l-4 border-outline-variant">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-on-surface-variant">Pendentes de Revisão</span>
            <span className="text-3xl font-bold text-on-surface mt-1">{pendingCount}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-outline">
            <span className="material-symbols-outlined text-[22px]">hourglass_empty</span>
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white p-4 rounded-xl shadow-xs flex items-center justify-between border-l-4 border-tertiary">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-tertiary">Aprovadas (Roteiro)</span>
            <span className="text-3xl font-bold text-tertiary mt-1">{approvedCount}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary">
            <span className="material-symbols-outlined text-[22px]">check_circle</span>
          </div>
        </div>

        {/* Answered */}
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

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-outline-variant/30 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-on-surface-variant font-semibold mr-1">Filtrar:</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
            }`}
          >
            Todas ({questions.length})
          </button>
          <button
            onClick={() => setFilter('Pendente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === 'Pendente'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
            }`}
          >
            Pendentes ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('Aprovada')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === 'Aprovada'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low hover:bg-surface-container text-tertiary'
            }`}
          >
            Aprovadas ({approvedCount})
          </button>
          <button
            onClick={() => setFilter('Respondida')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === 'Respondida'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low hover:bg-surface-container text-primary'
            }`}
          >
            Respondidas ({answeredCount})
          </button>
        </div>

        <div className="relative min-w-[260px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar pergunta ou tarefa..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface placeholder:text-on-surface-variant text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/30"
          />
        </div>
      </div>

      {/* Main Content Grid: 8 Cols Left (Questions) + 4 Cols Right (Meeting Agenda) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Questions List */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">checklist</span>
              <h2 className="text-xl font-bold text-on-surface">Perguntas Identificadas</h2>
            </div>
            <span className="text-xs font-medium text-on-surface-variant">
              {filteredQuestions.length} dúvidas listadas
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {filteredQuestions.map((q) => {
              const isApproved = q.status === 'Aprovada';
              const isEditing = editingId === q.id;

              return (
                <div
                  key={q.id}
                  className={`bg-white rounded-xl p-4 shadow-xs border-l-4 flex flex-col gap-3 transition-all ${
                    isApproved
                      ? 'border-tertiary'
                      : q.status === 'Respondida'
                      ? 'border-primary'
                      : 'border-outline-variant'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-surface-container text-primary text-xs font-mono font-bold">
                        {q.storyId}
                      </span>
                      <span className="text-sm font-bold text-on-surface">{q.storyTitle}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant text-xs font-semibold">
                          <span className="material-symbols-outlined text-[14px]">check</span>
                          Aprovada
                        </span>
                      ) : q.status === 'Respondida' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-semibold">
                          <span className="material-symbols-outlined text-[14px]">task_alt</span>
                          Respondida
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-medium">
                          <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
                          Pendente
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question text / inline editor */}
                  {isEditing ? (
                    <div className="flex flex-col gap-2 pt-1">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={2}
                        className="w-full p-2.5 text-xs bg-surface border border-primary/30 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 rounded text-xs text-on-surface-variant hover:bg-surface-container"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => saveEdit(q)}
                          className="px-3 py-1 rounded bg-primary text-white text-xs font-semibold shadow-xs"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-on-surface font-medium pl-1 leading-relaxed">
                      “{q.question}”
                    </p>
                  )}

                  {/* Note / answer if available */}
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

                  {/* Actions row */}
                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant/15 flex-wrap gap-2">
                    <button
                      onClick={() => onOpenStory(q.storyId)}
                      className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                      Ver tarefa no backlog
                    </button>

                    <div className="flex items-center gap-2">
                      {!isEditing && (
                        <button
                          onClick={() => startEdit(q)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          Editar
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onDeleteQuestion(q.id);
                          showToast('Pergunta removida.');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-error hover:bg-error-container/30 text-xs transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete_outline</span>
                        Descartar
                      </button>

                      <button
                        onClick={() => toggleStatus(q)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold shadow-xs transition-all ${
                          isApproved
                            ? 'bg-tertiary text-on-tertiary'
                            : 'bg-primary text-on-primary hover:bg-primary-container'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {isApproved ? 'check' : 'check'}
                        </span>
                        <span>{isApproved ? 'Aprovada' : 'Aprovar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {!hasSources && (
              <div className="bg-white rounded-xl p-8 text-center text-xs text-on-surface-variant shadow-xs flex flex-col items-center gap-3">
                <span>Este projeto ainda não tem perguntas. Adicione áudios ou documentos para identificá-las.</span>
                <button
                  onClick={() => onNavigate('projeto-ingestao')}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
                >
                  Adicionar Fontes
                </button>
              </div>
            )}

            {hasSources && filteredQuestions.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center text-xs text-on-surface-variant shadow-xs">
                Nenhuma pergunta encontrada para os filtros atuais.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Roteiro da Reunião (Approved Questions) */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-[22px]">format_list_bulleted</span>
              <h2 className="text-xl font-bold text-on-surface">Roteiro da Reunião</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant text-xs font-semibold">
              Perguntas Aprovadas
            </span>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col gap-4">
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Itens selecionados para alinhar com o cliente e time técnico na próxima reunião:
            </p>

            <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
              {approvedQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-surface-container-low p-3.5 rounded-lg flex flex-col gap-1.5 border border-outline-variant/20"
                >
                  <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-semibold">
                    <span>
                      {q.storyId} • {q.assignedRole || 'Geral'}
                    </span>
                    <span className="text-primary font-mono">Item #{idx + 1}</span>
                  </div>
                  <p className="text-xs text-on-surface font-medium leading-relaxed">
                    {idx + 1}. {q.question}
                  </p>
                </div>
              ))}

              {approvedQuestions.length === 0 && (
                <div className="p-6 text-center text-xs text-on-surface-variant bg-surface rounded-lg">
                  Nenhuma pergunta foi aprovada ainda. Aprove dúvidas na coluna ao lado para montar o roteiro!
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/20">
              <button
                onClick={handleCopyScript}
                disabled={approvedQuestions.length === 0}
                className="w-full py-2.5 rounded-lg bg-primary text-on-primary text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-xs hover:bg-primary-container active:scale-95 disabled:opacity-50 cursor-pointer"
                id="btn-copy-script"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                <span>Copiar Perguntas</span>
              </button>

              <button
                onClick={handleExportList}
                disabled={approvedQuestions.length === 0}
                className="w-full py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-outline-variant/30 disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Exportar Lista</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: + Nova Pergunta */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#213145]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[24px]">quiz</span>
                <h2 className="text-lg font-bold text-on-surface">Adicionar Nova Pergunta</h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface">User Story Vinculada</label>
                <select
                  value={newStoryId}
                  onChange={(e) => {
                    setNewStoryId(e.target.value);
                    const titles: Record<string, string> = {
                      '#US01': 'Autenticação Biométrica no login',
                      '#US02': 'Exportação de Extrato em PDF/Excel',
                      '#US03': 'Notificações no Celular',
                      '#US04': 'Recuperação de Senha por WhatsApp',
                      '#US05': 'Transferência Pix Agendada',
                      '#US06': 'Pagamento de Contas por Código de Barras',
                      '#US07': 'Limite Diário Customizável por Canal',
                      '#US08': 'Comprovante com Envio Automático por E-mail',
                    };
                    setNewStoryTitle(titles[e.target.value] || 'Geral');
                  }}
                  className="w-full px-3 py-2 bg-surface rounded-lg text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/30"
                >
                  <option value="#US01">#US01 - Autenticação Biométrica no login</option>
                  <option value="#US02">#US02 - Exportação de Extrato em PDF/Excel</option>
                  <option value="#US03">#US03 - Notificações no Celular</option>
                  <option value="#US04">#US04 - Recuperação de Senha por WhatsApp</option>
                  <option value="#US05">#US05 - Transferência Pix Agendada</option>
                  <option value="#US06">#US06 - Pagamento de Contas por Código de Barras</option>
                  <option value="#US07">#US07 - Limite Diário Customizável por Canal</option>
                  <option value="#US08">#US08 - Comprovante com Envio Automático por E-mail</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface">Papel / Responsável da Pergunta</label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="Ex: PO Financeiro, Especialista em Segurança, Arquiteto..."
                  required
                  className="w-full px-3 py-2 bg-surface rounded-lg text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/30"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface">Pergunta Clara e Objetiva</label>
                <textarea
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Qual regra de negócio ou exceção precisa ser esclarecida?"
                  rows={3}
                  required
                  className="w-full px-3 py-2 bg-surface rounded-lg text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/30 resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface">Observação de Origem (Opcional)</label>
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Ex: Lacuna identificada no áudio 2 ou regra BCB..."
                  className="w-full px-3 py-2 bg-surface rounded-lg text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/30"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-container text-on-surface-variant text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-xs"
                >
                  Adicionar ao Backlog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
