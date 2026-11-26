import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addAnalysisItem,
  analysisKey,
  deleteAnalysisItem,
  latestAnalysisKey,
  updateAnalysis,
  updateAnalysisItem,
  useAnalysis,
  useLatestAnalysis,
} from '../api/analyses.ts';
import { errorMessage } from '../api/client.ts';
import { isJobActive, startAnalysis, startGeneration, useJobs } from '../api/jobs.ts';
import { PROJECTS_QUERY_KEY, listProjects, updateProject } from '../api/projects.ts';
import { AnalysisItem, AnalysisItemType } from '../types.ts';

interface Props {
  projectId: string;
  analysisId: string;
  /** Fontes analisadas pelo job de análise; são as mesmas usadas ao criar as tarefas. */
  audioIds?: string[];
  documentIds?: string[];
  /** Com histórias, "Criar tarefas" gera sugestões de atualização em vez de novas histórias. */
  hasStories?: boolean;
  onClose: () => void;
  /** Sem esta função o modal só visualiza e edita a análise, sem o botão "Criar tarefas do Sistema". */
  onStarted?: () => void;
}

interface Section {
  type: AnalysisItemType;
  title: string;
  hint: string;
  complementLabel: string | null;
  placeholder: string;
}

const SECTIONS: Section[] = [
  { type: 'usuario', title: 'Usuários do sistema', hint: 'Papéis que vão usar o sistema. Viram o perfil das User Stories.', complementLabel: 'Descrição', placeholder: 'Ex.: coordenador pedagógico' },
  { type: 'requisito_negocio', title: 'Requisitos de negócio', hint: 'Metas e problemas que a solução resolve. Viram o benefício das User Stories.', complementLabel: null, placeholder: 'Ex.: reduzir o tempo de espera do cliente' },
  { type: 'funcionalidade', title: 'Funcionalidades', hint: 'O que o sistema deve permitir fazer. Cada uma vira uma ou mais User Stories.', complementLabel: 'Usuário', placeholder: 'Ex.: emitir o boletim da turma' },
  { type: 'termo', title: 'Termos do domínio', hint: 'Termos usados pelo cliente e o que significam. Orientam a escrita das User Stories.', complementLabel: 'Significado', placeholder: 'Ex.: ficha' },
  { type: 'fora_de_escopo', title: 'Fora de escopo', hint: 'Itens citados nas fontes que não viram User Stories.', complementLabel: 'Motivo', placeholder: 'Ex.: aprovar o cronograma do projeto' },
  { type: 'participante', title: 'Participantes da reunião', hint: 'Quem falou nas reuniões. Não são perfis de User Story.', complementLabel: 'Papel na reunião', placeholder: 'Ex.: Ana' },
];

type Draft = { text: string; complement: string };
type Busy = null | 'item' | 'saving' | 'starting';

const inputClass =
  'w-full px-2.5 py-1.5 text-xs bg-white border border-outline-variant/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 text-on-surface disabled:bg-surface disabled:text-on-surface-variant';

// Só um modal de análise aberto por vez: o que abre por último fecha os demais (ex.: o modal de revisão
// que abre ao fim de um job, por cima de um "Visualizar Análise" que ficou aberto).
const OPEN_EVENT = 'reqscriba:modal-analise-aberto';

export const AnalysisReviewModal: React.FC<Props> = ({
  projectId,
  analysisId: initialAnalysisId,
  audioIds = [],
  documentIds = [],
  hasStories = false,
  onClose,
  onStarted,
}) => {
  // Pode trocar para a análise mais recente quando esta for substituída ("Abrir análise atual").
  const [analysisId, setAnalysisId] = useState(initialAnalysisId);
  // Criar tarefas usa as fontes do job que gerou a análise inicial; outra análise abre só para visualizar.
  const canCreate = onStarted !== undefined && analysisId === initialAnalysisId;
  const queryClient = useQueryClient();
  const { data: analysis, isPending, error: loadError } = useAnalysis(analysisId);
  const { data: jobs = [] } = useJobs(projectId);
  const { data: latest } = useLatestAnalysis(projectId);
  // A API recusa edições nos dois casos (409); aqui a tela já fica somente leitura e explica o motivo.
  const analysisRunning = jobs.some((j) => j.type === 'analise_fontes' && isJobActive(j));
  // Ids são crescentes: comparar evita o falso aviso enquanto a lista ainda traz a análise anterior.
  const isStale = latest != null && Number(latest.id) > Number(analysisId);
  const locked = analysisRunning || isStale;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const token = Symbol('modal-analise');
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: token }));
    const closeIfOther = (e: Event) => {
      if ((e as CustomEvent).detail !== token) onCloseRef.current();
    };
    window.addEventListener(OPEN_EVENT, closeIfOther);
    return () => window.removeEventListener(OPEN_EVENT, closeIfOther);
  }, []);
  // Mesmo cache da lista de projetos do App: o título é o nome dado ao criar o projeto.
  const { data: projects = [] } = useQuery({ queryKey: PROJECTS_QUERY_KEY, queryFn: listProjects });
  const project = projects.find((p) => p.id === projectId);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [systemDraft, setSystemDraft] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ type: AnalysisItemType } & Draft | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = () => queryClient.invalidateQueries({ queryKey: analysisKey(analysisId) });
  const valueOf = (item: AnalysisItem): Draft => drafts[item.id] ?? { text: item.text, complement: item.complement };
  const changedItems = (analysis?.items ?? []).filter((item) => {
    const draft = drafts[item.id];
    return draft && (draft.text.trim() !== item.text || draft.complement.trim() !== item.complement);
  });
  const systemChanged = systemDraft !== null && analysis !== undefined && systemDraft.trim() !== analysis.system;
  const titleChanged = titleDraft !== null && project !== undefined && titleDraft.trim() !== project.name;
  const isDirty = changedItems.length > 0 || systemChanged || titleChanged;

  const run = async (kind: Busy, action: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const saveDrafts = async () => {
    if (titleChanged && !titleDraft?.trim()) throw new Error('O título do projeto não pode ficar vazio.');
    if (changedItems.some((item) => !drafts[item.id].text.trim())) {
      throw new Error('Um item não pode ficar sem texto. Preencha ou exclua o item.');
    }
    if (titleChanged && project && titleDraft) {
      await updateProject(projectId, titleDraft.trim(), project.description);
      setTitleDraft(null);
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    }
    for (const item of changedItems) {
      const draft = drafts[item.id];
      await updateAnalysisItem(analysisId, item.id, draft.text.trim(), draft.complement.trim());
    }
    if (systemChanged) {
      await updateAnalysis(analysisId, { sistema: systemDraft?.trim() || null });
      // O "Sistema" é a descrição do projeto exibida no cabeçalho e nos cards.
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    }
    setDrafts({});
    setSystemDraft(null);
    await reload();
  };

  const handleClose = () => {
    // Bloqueada, a API recusaria as alterações: elas são descartadas (o aviso no modal explica).
    if (!isDirty || locked) {
      onClose();
      return;
    }
    run('saving', async () => {
      await saveDrafts();
      onClose();
    });
  };

  const handleAdd = () => {
    if (!adding) return;
    if (!adding.text.trim()) {
      setError('Informe o texto do novo item.');
      return;
    }
    run('item', async () => {
      await addAnalysisItem(analysisId, adding.type, adding.text.trim(), adding.complement.trim());
      setAdding(null);
      await reload();
    });
  };

  const handleDelete = (item: AnalysisItem) => {
    if (!window.confirm(`Excluir "${item.text}" da análise?`)) return;
    run('item', async () => {
      await deleteAnalysisItem(analysisId, item.id);
      const { [item.id]: _removed, ...rest } = drafts;
      setDrafts(rest);
      await reload();
    });
  };

  const handleCreate = () =>
    run('saving', async () => {
      await saveDrafts();
      await updateAnalysis(analysisId, { revisada: true });
      setBusy('starting');
      if (hasStories) await startAnalysis(queryClient, projectId, audioIds, documentIds);
      else await startGeneration(queryClient, projectId, audioIds, documentIds, analysisId);
      await queryClient.invalidateQueries({ queryKey: latestAnalysisKey(projectId) });
      onStarted?.();
    });

  const isBusy = busy !== null;
  const readOnly = isBusy || locked;

  const openLatest = () => {
    if (!latest) return;
    setDrafts({});
    setTitleDraft(null);
    setSystemDraft(null);
    setAdding(null);
    setError(null);
    setAnalysisId(latest.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#213145]/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="analysis-review-title"
        className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-outline-variant/30"
      >
        <div className="flex items-start gap-3 p-6 pb-4 border-b border-outline-variant/20">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">psychology</span>
          </div>
          <div>
            <h2 id="analysis-review-title" className="text-base font-bold text-on-surface">
              {canCreate ? 'Análise das fontes concluída' : 'Análise do projeto'}
            </h2>
            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              {canCreate
                ? 'Este é o entendimento da IA sobre o projeto. Revise, corrija o que for preciso e clique em "Criar tarefas do Sistema": a análise aprovada orienta a criação das User Stories.'
                : 'Entendimento do projeto usado na criação das User Stories. As correções feitas aqui valem para as próximas gerações.'}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5">
          {analysisRunning && (
            <div role="status" className="flex items-start gap-2 text-xs text-on-surface bg-primary-fixed/30 border border-primary/20 rounded-lg px-3 py-2.5">
              <span className="inline-block w-3.5 h-3.5 mt-0.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0"></span>
              <span>
                Há uma análise das fontes em andamento. A edição fica bloqueada até ela terminar, porque a nova
                análise parte desta e não receberia as alterações feitas agora.
                {isDirty && ' As alterações ainda não salvas serão descartadas ao fechar.'}
              </span>
            </div>
          )}
          {!analysisRunning && isStale && (
            <div role="alert" className="flex items-center justify-between gap-3 flex-wrap text-xs text-on-surface bg-tertiary-fixed/40 border border-tertiary/20 rounded-lg px-3 py-2.5">
              <span>
                Uma análise mais nova foi gerada. Esta ficou só para consulta: edite a análise atual.
                {isDirty && ' As alterações ainda não salvas serão descartadas.'}
              </span>
              <button
                type="button"
                onClick={openLatest}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-surface-container border border-outline-variant/30 text-primary text-xs font-semibold shadow-2xs cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                <span>Abrir análise atual</span>
              </button>
            </div>
          )}
          {isPending && <p role="status" className="text-xs text-on-surface-variant">Carregando análise...</p>}
          {loadError && <p role="alert" className="text-xs text-error">{errorMessage(loadError)}</p>}

          {analysis && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-on-surface">Título do Projeto</span>
                <input
                  value={titleDraft ?? project?.name ?? ''}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  maxLength={200}
                  required
                  disabled={readOnly || !project}
                  placeholder="Ex: Painel do Cliente, Novo Checkout, Conta Digital..."
                  className={`${inputClass} text-sm font-semibold`}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-on-surface">Sistema</span>
                <textarea
                  value={systemDraft ?? analysis.system}
                  onChange={(e) => setSystemDraft(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  disabled={readOnly}
                  placeholder="Qual sistema, produto ou solução está sendo discutido"
                  className={`${inputClass} resize-none leading-relaxed`}
                />
              </label>

              {SECTIONS.map((section) => {
                const items = analysis.items.filter((i) => i.type === section.type);
                const isAdding = adding?.type === section.type;
                return (
                  <section key={section.type} aria-labelledby={`secao-${section.type}`} className="flex flex-col gap-2">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <h3 id={`secao-${section.type}`} className="text-xs font-bold text-on-surface">
                          {section.title} <span className="text-on-surface-variant font-semibold">({items.length})</span>
                        </h3>
                        <p className="text-[11px] text-on-surface-variant">{section.hint}</p>
                      </div>
                      {!isAdding && (
                        <button
                          type="button"
                          onClick={() => setAdding({ type: section.type, text: '', complement: '' })}
                          disabled={readOnly}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-primary hover:bg-primary/5 text-xs font-semibold shrink-0 disabled:opacity-50 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                          <span>Adicionar</span>
                        </button>
                      )}
                    </div>

                    {items.length === 0 && !isAdding && (
                      <p className="text-[11px] text-on-surface-variant bg-surface rounded-lg px-3 py-2">Nenhum item identificado.</p>
                    )}

                    {items.map((item) => {
                      const value = valueOf(item);
                      const setValue = (changes: Partial<Draft>) => setDrafts({ ...drafts, [item.id]: { ...value, ...changes } });
                      return (
                        <div key={item.id} className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex gap-2 items-start">
                          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.code && <span className="font-mono text-[11px] font-bold text-primary">{item.code}</span>}
                              {item.references.length > 0 && (
                                <span className="text-[10px] text-on-surface-variant">atende {item.references.join(', ')}</span>
                              )}
                              {item.hasEvidence ? (
                                <span className="text-[10px] text-on-surface-variant truncate" title={item.sourceNames.join(', ')}>
                                  fonte: {item.sourceNames.join(', ')}
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-semibold">
                                  sem evidência
                                </span>
                              )}
                            </div>
                            <input
                              aria-label={`${section.title}: texto`}
                              value={value.text}
                              maxLength={500}
                              disabled={readOnly}
                              onChange={(e) => setValue({ text: e.target.value })}
                              className={inputClass}
                            />
                            {section.complementLabel && (
                              <input
                                aria-label={`${section.title}: ${section.complementLabel.toLowerCase()}`}
                                value={value.complement}
                                maxLength={500}
                                disabled={readOnly}
                                placeholder={section.complementLabel}
                                onChange={(e) => setValue({ complement: e.target.value })}
                                className={`${inputClass} text-on-surface-variant`}
                              />
                            )}
                          </div>
                          <button
                            type="button"
                            title="Excluir item"
                            onClick={() => handleDelete(item)}
                            disabled={readOnly}
                            className="p-1 rounded text-outline hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete_outline</span>
                          </button>
                        </div>
                      );
                    })}

                    {isAdding && adding && (
                      <div className="p-2.5 rounded-xl bg-primary-fixed/20 border border-primary/30 flex flex-col gap-1.5">
                        <input
                          aria-label={`Novo item em ${section.title}`}
                          autoFocus
                          value={adding.text}
                          maxLength={500}
                          disabled={readOnly}
                          placeholder={section.placeholder}
                          onChange={(e) => setAdding({ ...adding, text: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                          className={inputClass}
                        />
                        {section.complementLabel && (
                          <input
                            aria-label={`Novo item em ${section.title}: ${section.complementLabel.toLowerCase()}`}
                            value={adding.complement}
                            maxLength={500}
                            disabled={readOnly}
                            placeholder={`${section.complementLabel} (opcional)`}
                            onChange={(e) => setAdding({ ...adding, complement: e.target.value })}
                            className={inputClass}
                          />
                        )}
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setAdding(null)} disabled={isBusy} className="px-3 py-1 rounded-lg text-on-surface-variant hover:bg-surface-container text-xs font-semibold cursor-pointer">
                            Cancelar
                          </button>
                          <button type="button" onClick={handleAdd} disabled={readOnly} className="px-3 py-1 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer">
                            {busy === 'item' ? 'Adicionando...' : 'Adicionar item'}
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}
            </>
          )}
        </div>

        <div className="p-4 px-6 border-t border-outline-variant/20 flex flex-col gap-3">
          {error && (
            <p role="alert" className="text-xs text-on-error-container bg-error-container rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {canCreate && (
              <span className="text-[11px] text-on-surface-variant">
                {hasStories
                  ? 'As User Stories existentes receberão sugestões de atualização; nada muda sem sua aprovação.'
                  : 'As User Stories serão criadas em segundo plano; você pode continuar navegando.'}
              </span>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleClose}
                disabled={isBusy}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50 cursor-pointer"
              >
                {busy === 'saving' && !canCreate ? 'Salvando…' : isDirty && !locked ? 'Salvar e fechar' : 'Fechar'}
              </button>
              {canCreate && (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={readOnly || !analysis}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">task_alt</span>
                  <span>
                    {busy === 'saving' ? 'Salvando…' : busy === 'starting' ? 'Iniciando…' : 'Criar tarefas do Sistema'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
