import React, { useState } from 'react';
import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../api/client.ts';
import { useEvaluatingStoryIds } from '../api/jobs.ts';
import { PROJECTS_QUERY_KEY } from '../api/projects.ts';
import { generateQuestions, questionsKey } from '../api/questions.ts';
import {
  applyRewrite,
  approveStory,
  auditEvidence,
  criteriaPayload,
  dismissRewrite,
  evaluateStory,
  evaluationMutationKey,
  formatScore,
  generateCriteria,
  getDismissedRewrites,
  pendingRewrite,
  rejectStory,
  storiesKey,
  storyKey,
  structuralValidationKey,
  updateStory,
  useStories,
  useStory,
  useStructuralValidation,
} from '../api/stories.ts';
import {
  approveSuggestion,
  rejectSuggestion,
  suggestionsKey,
  usePendingSuggestions,
  useSuggestion,
} from '../api/suggestions.ts';
import { AuditBadge, AuditDetails, EvidenceAuditPanel } from '../components/EvidenceAuditPanel.tsx';
import { SourceEvidenceList } from '../components/SourceEvidenceList.tsx';
import { StoryText } from '../components/StoryText.tsx';
import { SuggestionPanel } from '../components/SuggestionPanel.tsx';
import { SuggestionIndicator } from '../components/SuggestionIndicator.tsx';
import { AuditItem, HeuristicCategory, HeuristicItem, Project, ScreenType, TestCriterion } from '../types.ts';

const TOTAL_CRITERIA = 13;

const HEURISTIC_COLUMNS: Array<{ category: HeuristicCategory; icon: string; color: string }> = [
  { category: '1. Estrutura do Texto', icon: 'spellcheck', color: 'text-primary' },
  { category: '2. Sentido e Negócio', icon: 'chat', color: 'text-secondary' },
  { category: '3. Prática e Execução', icon: 'verified', color: 'text-tertiary' },
];

const HeuristicCard: React.FC<{ item: HeuristicItem }> = ({ item }) => {
  const met = item.status === 'Atendido';
  return (
    <div className={`p-2.5 rounded-lg border flex flex-col gap-1 transition-all ${met ? 'bg-white border-surface-container' : 'bg-secondary-fixed/15 border-secondary-fixed/40'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold ${met ? 'text-on-surface' : 'text-secondary font-bold'}`}>{item.name}</span>
        <span className={`text-[11px] font-semibold flex items-center gap-0.5 shrink-0 ${met ? 'text-tertiary' : 'text-secondary'}`}>
          <span className="material-symbols-outlined text-[13px]">{met ? 'check' : 'warning'}</span>
          {item.status}
        </span>
      </div>
      <p className="text-xs text-on-surface-variant leading-relaxed">{item.description}</p>
      {item.tip && (
        <span className="text-[11px] text-secondary font-medium mt-0.5 flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
          {item.tip}
        </span>
      )}
    </div>
  );
};

const GHERKIN_PARTS = [
  ['Dado', 'given'],
  ['Quando', 'when'],
  ['Então', 'then'],
] as const;

// Critério de aceitação: Dado/Quando/Então (quando gerado pela IA), trechos que o sustentam e sinalizações.
const CriterionCard: React.FC<{
  criterion: TestCriterion;
  index: number;
  busy: boolean;
  audit?: AuditItem;
  onDelete: () => void;
}> = ({ criterion, index, busy, audit, onDelete }) => {
  const structured = Boolean(criterion.when || criterion.then);
  return (
    <div data-testid="criterion" className="bg-surface-container-low rounded-xl p-4 border border-surface-container flex items-start justify-between gap-4 group">
      <div className="flex items-start gap-3 min-w-0">
        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">{index + 1}</span>
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-on-surface">{criterion.title}</span>
            {criterion.aiGenerated && (
              <span className="px-1.5 py-0.5 rounded bg-primary-fixed text-primary text-[10px] font-semibold" title="Gerado pela IA a partir das evidências da User Story">IA</span>
            )}
            {audit && <AuditBadge item={audit} />}
          </div>
          {structured ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs leading-relaxed">
              {GHERKIN_PARTS.map(([label, key]) =>
                criterion[key] ? (
                  <React.Fragment key={key}>
                    <dt className="font-semibold text-primary">{label}</dt>
                    <dd className="text-on-surface">{criterion[key]}</dd>
                  </React.Fragment>
                ) : null
              )}
            </dl>
          ) : (
            <p className="text-xs text-on-surface leading-relaxed whitespace-pre-line">{criterion.criterion}</p>
          )}
          {criterion.sources.length > 0 && (
            <ul data-testid="criterion-sources" className="flex flex-col gap-1 mt-1">
              {criterion.sources.map((source) => (
                <li key={source.chunkId} className="text-[11px] text-on-surface-variant flex items-start gap-1">
                  <span className="material-symbols-outlined text-[13px] text-primary mt-px">link</span>
                  <span className="min-w-0">
                    <span className="font-semibold text-on-surface">{source.fileName}</span>
                    {source.location && <span> · {source.location}</span>}
                    {source.parts.length > 0 && <span> · sustenta: {source.parts.join(', ')}</span>}
                    {source.quote && <span className="block italic line-clamp-2" title={source.quote}>"{source.quote}"</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {audit && <AuditDetails item={audit} />}
          {criterion.warnings.length > 0 && (
            <ul data-testid="criterion-warnings" className="flex flex-col gap-0.5">
              {criterion.warnings.map((warning, i) => (
                <li key={i} className="text-[11px] text-[#92400e] flex items-start gap-1">
                  <span className="material-symbols-outlined text-[13px] mt-px">warning</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <button onClick={onDelete} disabled={busy} title="Excluir regra" type="button" className="text-outline hover:text-error p-1 rounded transition-colors shrink-0 cursor-pointer">
        <span className="material-symbols-outlined text-[18px]">delete_outline</span>
      </button>
    </div>
  );
};

interface AvaliacaoQualidadeScreenProps {
  project: Project;
  storyId: string;
  onSelectStory: (storyId: string) => void;
  onNavigate: (screen: ScreenType) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const AvaliacaoQualidadeScreen: React.FC<AvaliacaoQualidadeScreenProps> = ({
  project,
  storyId,
  onSelectStory,
  onNavigate,
  showToast,
}) => {
  const queryClient = useQueryClient();
  const { data: story, isPending, error } = useStory(storyId);
  const { data: structuralIssues = [] } = useStructuralValidation(storyId);
  const { data: stories = [] } = useStories(project.id);
  const { data: suggestions = [] } = usePendingSuggestions(project.id);
  const evaluatingIds = useEvaluatingStoryIds(project.id);

  const [isEditing, setIsEditing] = useState(false);
  const [comoInput, setComoInput] = useState('');
  const [queroInput, setQueroInput] = useState('');
  const [paraInput, setParaInput] = useState('');
  const [newRuleModalOpen, setNewRuleModalOpen] = useState(false);
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleCriterion, setNewRuleCriterion] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isGeneratingCriteria, setIsGeneratingCriteria] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [dismissedRewrites, setDismissedRewrites] = useState(getDismissedRewrites);

  const refreshStory = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: storyKey(storyId) }),
      queryClient.invalidateQueries({ queryKey: structuralValidationKey(storyId) }),
      queryClient.invalidateQueries({ queryKey: storiesKey(project.id) }),
      queryClient.invalidateQueries({ queryKey: suggestionsKey(project.id) }),
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY }),
    ]);

  // A avaliação roda o LLM dentro da requisição e continua se o usuário sair desta tela.
  const evaluation = useMutation({
    mutationKey: evaluationMutationKey(storyId),
    mutationFn: (_previousScore: number | null) => evaluateStory(storyId),
    onSuccess: async (score, previousScore) => {
      await refreshStory();
      showToast(
        previousScore === null
          ? `Análise concluída: qualidade de ${formatScore(score)}.`
          : `Análise concluída: qualidade de ${formatScore(previousScore)} para ${formatScore(score)}.`,
        'verified'
      );
    },
    onError: async (e) => {
      await refreshStory();
      showToast(`A análise falhou: ${errorMessage(e)} Tente de novo em "Analisar a qualidade".`, 'error');
    },
  });
  const isAnalyzing = useIsMutating({ mutationKey: evaluationMutationKey(storyId) }) > 0;

  const storySuggestions = suggestions.filter((s) => s.storyId === storyId);
  const index = Math.min(suggestionIndex, Math.max(0, storySuggestions.length - 1));
  const updateSuggestion = storySuggestions[index] ?? null;
  const { data: suggestionDetail } = useSuggestion(updateSuggestion?.id ?? null);

  if (isPending) {
    return <p role="status" className="p-10 text-center text-xs text-on-surface-variant">Carregando User Story...</p>;
  }
  if (error || !story) {
    return <p role="alert" className="p-10 text-center text-xs text-error">{errorMessage(error)}</p>;
  }

  // Reescrita da avaliação: só aparece sem sugestão de atualização pendente e se ainda mudar o texto.
  const pendingStoryRewrite = pendingRewrite(story, dismissedRewrites);
  const rewrite = updateSuggestion ? null : pendingStoryRewrite;
  const recommendationCount = storySuggestions.length + (pendingStoryRewrite ? 1 : 0);

  const isBusy = isSaving || isAnalyzing || isGeneratingCriteria || isAuditing;
  const isApproved = story.status === 'Aprovada';

  const runChange = async (change: () => Promise<unknown>, successMessage?: string): Promise<boolean> => {
    setIsSaving(true);
    try {
      await change();
      await refreshStory();
      if (successMessage) showToast(successMessage);
      return true;
    } catch (e) {
      showToast(errorMessage(e), 'error');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStructured = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const saved = await runChange(
      () =>
        updateStory(storyId, {
          ...(comoInput.trim() ? { perfil: comoInput.trim() } : {}),
          funcionalidade: queroInput.trim(),
          ...(paraInput.trim() ? { beneficio: paraInput.trim() } : {}),
        }),
      'User Story atualizada. A nota fica desatualizada até a próxima análise.'
    );
    if (saved) setIsEditing(false);
  };

  // Aplicar: a sugestão vira a versão atual e os 13 critérios são reavaliados. Nunca aprova a história.
  // Reescrita que divide a história: a primeira parte fica nesta User Story e as demais viram novas.
  const handleApplySuggestion = async () => {
    let createdCodes: string[] = [];
    const applied = await runChange(async () => {
      if (updateSuggestion) return approveSuggestion(updateSuggestion.id);
      createdCodes = await applyRewrite(storyId, rewrite ?? '');
    });
    if (!applied) return;
    setSuggestionIndex(0);
    const created = createdCodes.length ? ` Criadas: ${createdCodes.join(', ')}.` : '';
    showToast(`Sugestão aplicada.${created} Reavaliando os 13 critérios...`, 'sync');
    evaluation.mutate(story.qualityScore);
  };

  const handleRejectSuggestion = async () => {
    if (updateSuggestion) {
      await runChange(() => rejectSuggestion(updateSuggestion.id), 'Sugestão rejeitada. A User Story foi mantida.');
      setSuggestionIndex(0);
    } else if (rewrite) {
      dismissRewrite(storyId, rewrite);
      setDismissedRewrites(getDismissedRewrites());
      showToast('Sugestão rejeitada. A User Story foi mantida.');
    }
  };

  const handleAddRule = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!newRuleCriterion.trim()) return;
    const newRule: TestCriterion = {
      id: '',
      title: newRuleTitle.trim(),
      criterion: newRuleCriterion.trim(),
      sources: [],
      warnings: [],
      aiGenerated: false,
    };
    const saved = await runChange(
      () => updateStory(storyId, { criterios_aceitacao: criteriaPayload([...story.criteria, newRule]) }),
      'Novo critério de aceite adicionado!'
    );
    if (saved) {
      setNewRuleModalOpen(false);
      setNewRuleTitle('');
      setNewRuleCriterion('');
    }
  };

  const handleDeleteRule = (id: string) =>
    runChange(
      () => updateStory(storyId, { criterios_aceitacao: criteriaPayload(story.criteria.filter((c) => c.id !== id)) }),
      'Critério removido.'
    );

  // Critérios gerados pela IA a partir das evidências; os atuais ficam na versão anterior da User Story.
  const handleGenerateCriteria = async () => {
    if (story.criteria.length > 0 && !window.confirm('Os critérios atuais serão substituídos pelos gerados pela IA. A versão anterior fica no histórico. Continuar?')) return;
    setIsGeneratingCriteria(true);
    showToast('Gerando critérios de aceitação a partir das evidências...', 'sync');
    try {
      const result = await generateCriteria(storyId);
      await refreshStory();
      const total = result.criterios_aceitacao.length;
      showToast(
        total > 0 ? `${total} critério(s) de aceitação gerado(s).` : 'As fontes não trazem base para critérios; veja as lacunas registradas.',
        total > 0 ? 'auto_awesome' : 'info'
      );
    } catch (e) {
      showToast(errorMessage(e), 'error');
    } finally {
      setIsGeneratingCriteria(false);
    }
  };

  // Auditoria semântica: avalia se os trechos sustentam cada componente e cada critério; não altera nada.
  const handleAudit = async () => {
    setIsAuditing(true);
    showToast('Auditando as evidências da User Story...', 'sync');
    try {
      await auditEvidence(storyId);
      await refreshStory();
      showToast('Auditoria concluída. Revise os itens sinalizados.', 'fact_check');
    } catch (e) {
      showToast(errorMessage(e), 'error');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleGenerateQuestions = async () => {
    setIsGeneratingQuestions(true);
    showToast('Gerando perguntas a partir dos defeitos encontrados...', 'sync');
    try {
      const { total, limitations } = await generateQuestions(storyId);
      await queryClient.invalidateQueries({ queryKey: questionsKey(project.id) });
      showToast(total > 0 ? `${total} pergunta(s) criada(s) em Follow-up.` : limitations[0] ?? 'Nenhuma pergunta foi gerada.', total > 0 ? 'auto_awesome' : 'info');
    } catch (e) {
      showToast(errorMessage(e), 'error');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const metCount = story.heuristics.filter((h) => h.status === 'Atendido').length;
  const attentionCount = story.heuristics.length - metCount;
  const attentionMessages = [...story.missingInfo, ...story.unsupportedClaims.map((c) => `Afirmação sem evidência: ${c}`)];

  return (
    <div className="w-full bg-surface pb-16">
      <section className="w-full py-6 bg-white shadow-xs border-b border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <button onClick={() => onNavigate('visao-geral')} className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Backlog</span>
              </button>
              <span className="text-outline-variant">/</span>
              <span className="text-primary">{story.code} Revisão de Clareza</span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={storyId}
                disabled={isBusy}
                aria-label="Trocar de User Story"
                onChange={(e) => {
                  setSuggestionIndex(0);
                  setIsEditing(false);
                  onSelectStory(e.target.value);
                }}
                className="px-2.5 py-1 rounded-lg bg-surface border border-outline-variant/30 text-xs font-semibold text-on-surface focus:outline-none"
              >
                {stories.map((s) => (
                  <option key={s.id} value={s.id}>{s.code} - {s.title}</option>
                ))}
              </select>
              <SuggestionIndicator count={recommendationCount} loading={evaluatingIds.has(storyId)} />
              <span data-testid="story-status" className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${
                story.status === 'Aprovada' ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant' : story.status === 'Desaprovada' ? 'bg-error-container text-on-error-container' : 'bg-primary-fixed text-on-primary-fixed'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current inline-block"></span>
                {story.status}
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container pb-4">
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded bg-primary text-on-primary text-xs font-bold font-mono">{story.code}</span>
                  <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">{story.title}</h1>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => {
                      setComoInput(story.actor);
                      setQueroInput(story.action);
                      setParaInput(story.benefit);
                      setIsEditing(true);
                    }}
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary text-xs font-semibold border border-surface-container transition-colors shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    <span>Editar User Story</span>
                  </button>
                )}
              </div>

              {!isEditing && (
                <p data-testid="story-text" className="text-sm text-on-surface-variant italic mt-1 leading-relaxed"><StoryText text={story.summary} /></p>
              )}

              {isEditing && (
                <form onSubmit={handleSaveStructured} className="mt-2 p-4 bg-surface-container-low rounded-xl border border-primary/20 flex flex-col gap-3 shadow-xs">
                  <div className="flex items-center justify-between pb-1 border-b border-surface-container">
                    <span className="text-xs text-primary font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">tune</span>
                      Edição da User Story
                    </span>
                    <span className="text-[11px] text-outline">Formato Ágil</span>
                  </div>
                  {([
                    ['input-story-como', 'Como', comoInput, setComoInput, 'Ex: cliente correntista', false],
                    ['input-story-quero', 'Quero', queroInput, setQueroInput, 'Ex: entrar no aplicativo usando reconhecimento facial', true],
                    ['input-story-para', 'Para', paraInput, setParaInput, 'Ex: acessar a conta rapidamente sem digitar senha', false],
                  ] as const).map(([id, label, value, setValue, placeholder, required]) => (
                    <div key={id} className="flex flex-col gap-1">
                      <label htmlFor={id} className="text-xs font-semibold text-on-surface">{label}</label>
                      <input
                        id={id}
                        type="text"
                        value={value}
                        maxLength={500}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        required={required}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-surface-container rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface shadow-xs"
                      />
                    </div>
                  ))}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setIsEditing(false)} className="px-3.5 py-1.5 rounded-lg border border-surface-container bg-white hover:bg-surface-container text-on-surface-variant text-xs font-semibold transition-colors cursor-pointer">
                      Cancelar
                    </button>
                    <button type="submit" disabled={isBusy} className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors disabled:opacity-50 cursor-pointer">
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
              <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2.5 rounded-xl border border-surface-container">
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">Qualidade da User Story</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span data-testid="story-score" className="text-2xl font-bold text-primary">{formatScore(story.qualityScore)}</span>
                    <span className="px-2 py-0.5 rounded bg-primary-fixed text-primary text-[11px] font-semibold">{story.qualityLabel}</span>
                    {(story.qualityOutdated || isAnalyzing) && (
                      <span className="px-2 py-0.5 rounded bg-[#fef3c7] text-[#92400e] text-[11px] font-semibold" title="A User Story mudou desde a última análise. Use Analisar a qualidade.">
                        {isAnalyzing ? 'Analisando...' : 'Desatualizada'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        <div className="bg-white rounded-xl p-4 shadow-xs border border-surface-container flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">rule_settings</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-on-surface">Ações da Tarefa</span>
              <span className="text-xs text-on-surface-variant">Defina a aprovação ou execute nova verificação dos requisitos</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => evaluation.mutate(story.qualityScore)} disabled={isBusy} type="button" className="px-3.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary text-xs font-semibold border border-surface-container transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              <span>{isAnalyzing ? 'Analisando...' : 'Analisar a qualidade'}</span>
            </button>
            <button onClick={handleGenerateQuestions} disabled={isBusy || isGeneratingQuestions} type="button" className="px-3.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary text-xs font-semibold border border-surface-container transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">quiz</span>
              <span>{isGeneratingQuestions ? 'Gerando...' : 'Gerar Perguntas'}</span>
            </button>
            <button onClick={() => runChange(() => rejectStory(storyId), 'User Story desaprovada.')} disabled={isBusy} type="button" className="px-3.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-error text-xs font-semibold border border-surface-container transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">thumb_down</span>
              <span>Desaprovar</span>
            </button>
            <button onClick={() => runChange(() => approveStory(storyId), 'User Story aprovada.')} disabled={isBusy} type="button" className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>Aprovar</span>
            </button>
          </div>
        </div>

        <section className="bg-white rounded-xl p-6 shadow-xs border border-surface-container flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-surface-container">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">checklist</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-on-surface">Critérios de Teste (Regras Simples)</h2>
                <p className="text-xs text-on-surface-variant">Critérios objetivos para verificar a entrega</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleGenerateCriteria}
                disabled={isBusy || isApproved}
                type="button"
                title={isApproved ? 'User Stories aprovadas não recebem critérios da IA. Edite-os manualmente.' : 'Gera critérios a partir das evidências desta User Story'}
                className="px-3.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary text-xs font-semibold flex items-center gap-1 border border-surface-container transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                <span>{isGeneratingCriteria ? 'Gerando...' : story.criteria.length > 0 ? 'Regerar critérios' : 'Gerar critérios'}</span>
              </button>
              <button onClick={() => setNewRuleModalOpen(true)} disabled={isBusy} type="button" className="px-3.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary text-xs font-semibold flex items-center gap-1 border border-surface-container transition-colors shadow-xs disabled:opacity-50 cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Adicionar Regra</span>
              </button>
            </div>
          </div>

          {story.criteriaGaps.length > 0 && (
            <div data-testid="criteria-gaps" className="p-3 bg-[#fffbeb] border border-[#fcd34d] rounded-lg flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#d97706]">info</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-[#78350f]">O que falta nas fontes para os critérios</span>
                <ul className="text-xs text-[#92400e] leading-relaxed list-disc pl-4">
                  {story.criteriaGaps.map((gap, i) => <li key={i}>{gap}</li>)}
                </ul>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {story.criteria.length === 0 && <p className="text-xs text-on-surface-variant text-center py-3">Nenhum critério definido.</p>}
            {story.criteria.map((criterion, idx) => (
              <CriterionCard
                key={criterion.id}
                criterion={criterion}
                index={idx}
                busy={isBusy}
                audit={criterion.criterionId != null ? story.evidenceAudit?.criteria[criterion.criterionId] : undefined}
                onDelete={() => handleDeleteRule(criterion.id)}
              />
            ))}
          </div>
        </section>

        <EvidenceAuditPanel
          audit={story.evidenceAudit}
          issues={structuralIssues}
          busy={isBusy}
          auditing={isAuditing}
          onAudit={handleAudit}
        />

        <SuggestionPanel
          currentText={story.summary}
          suggestionText={updateSuggestion ? updateSuggestion.proposedText : rewrite}
          notice={updateSuggestion ? `${updateSuggestion.typeLabel}: ${updateSuggestion.justification}` : 'Reescrita sugerida pela avaliação de qualidade.'}
          changedFields={suggestionDetail?.changedFields}
          busy={isBusy}
          position={{
            index,
            total: storySuggestions.length,
            onPrevious: () => setSuggestionIndex(index - 1),
            onNext: () => setSuggestionIndex(index + 1),
          }}
          onApply={handleApplySuggestion}
          onReject={handleRejectSuggestion}
        />

        {attentionMessages.length > 0 && (
          <div className="p-4 bg-[#fffbeb] border border-[#fcd34d] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#fef3c7] text-[#d97706] flex items-center justify-center shrink-0 mt-0.5 border border-[#fde68a]">
                <span className="material-symbols-outlined text-[20px]">warning</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#78350f]">Atenção: Falta de Informação nas Fontes</h3>
                  <span className="px-2 py-0.5 rounded bg-[#fef3c7] text-[#92400e] border border-[#fde68a] text-[11px] font-semibold">Pendência Identificada</span>
                </div>
                <ul className="text-xs text-[#92400e] leading-relaxed list-disc pl-4">
                  {attentionMessages.map((message, i) => <li key={i}>{message}</li>)}
                </ul>
              </div>
            </div>
            <button onClick={() => onNavigate('follow-up')} className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">quiz</span>
              <span>Resolver em Perguntas de Follow-up</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        )}

        <SourceEvidenceList
          audioEvidence={story.audioEvidence}
          documentEvidence={story.documentEvidence}
          onOpenSources={() => onNavigate('projeto-fontes')}
        />

        <section className="bg-white rounded-xl p-6 shadow-xs border border-surface-container flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-surface-container">
            <div>
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
                <span>Análise de Qualidade da User Story</span>
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Veja se a User Story está clara, objetiva e pronta para desenvolvimento sem complicações.
              </p>
            </div>
            {story.heuristics.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span data-testid="heuristics-met" className="px-3 py-0.5 rounded-full bg-tertiary/10 text-tertiary text-xs font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  {metCount} de {TOTAL_CRITERIA} Atendidos
                </span>
                <span className="px-3 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant text-xs font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  {attentionCount} Requerem Atenção
                </span>
              </div>
            )}
          </div>

          {story.heuristics.length === 0 ? (
            <p className="text-xs text-on-surface-variant text-center py-3">
              Esta User Story ainda não foi avaliada. Use "Analisar a qualidade" para verificar os {TOTAL_CRITERIA} critérios.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {HEURISTIC_COLUMNS.map(({ category, icon, color }) => {
                const items = story.heuristics.filter((h) => h.category === category);
                return (
                  <div key={category} className="bg-surface-container-low rounded-xl p-4 border border-surface-container flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-surface-container pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`material-symbols-outlined text-[18px] ${color}`}>{icon}</span>
                        <span className="text-xs font-bold text-on-surface">{category}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[11px] font-semibold">{items.length} Critérios</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {items.map((item) => <HeuristicCard key={item.id} item={item} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl p-6 shadow-xs border border-surface-container flex flex-col gap-4">
          <div className="flex items-center gap-3 pb-2 border-b border-surface-container">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">history</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface">Histórico de Versões</h2>
              <p className="text-xs text-on-surface-variant">Acompanhe as mudanças feitas nesta tarefa ao longo do tempo</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {story.versions.map((ver) => (
              <div key={ver.version} data-testid="version" className={`bg-surface-container-low rounded-xl p-4 border flex flex-col gap-2 shadow-xs ${ver.isCurrent ? 'border-primary/30' : 'border-surface-container'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${ver.isCurrent ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface'}`}>{ver.version}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 ${ver.isCurrent ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      <span className="material-symbols-outlined text-[13px]">{ver.isAi ? 'smart_toy' : 'person'}</span>
                      {ver.type}
                    </span>
                    <span className="text-[11px] text-on-surface-variant">por {ver.author}</span>
                  </div>
                  <span className="text-xs text-outline font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    {ver.timestamp}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-surface-container mt-1">
                  <p className="text-xs text-on-surface leading-relaxed"><StoryText text={ver.text} /></p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {newRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#213145]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[24px]">add_task</span>
                <h2 className="text-lg font-bold text-on-surface">Adicionar Critério de Teste</h2>
              </div>
              <button onClick={() => setNewRuleModalOpen(false)} className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddRule} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="input-rule-title" className="text-xs font-semibold text-on-surface">Título da Regra</label>
                <input
                  id="input-rule-title"
                  type="text"
                  value={newRuleTitle}
                  maxLength={200}
                  onChange={(e) => setNewRuleTitle(e.target.value)}
                  placeholder="Ex: Tempo de Resposta, Limite Noturno"
                  className="w-full px-3 py-2 bg-surface rounded-lg text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="input-rule-criterion" className="text-xs font-semibold text-on-surface">Critério de aceite</label>
                <textarea
                  id="input-rule-criterion"
                  value={newRuleCriterion}
                  maxLength={2000}
                  onChange={(e) => setNewRuleCriterion(e.target.value)}
                  placeholder={"Estrutura Gherkin (Dado / Quando / Então):\n• Dado que [contexto ou estado inicial do sistema]\n• Quando [a ação executada pelo usuário]\n• Então [o resultado esperado e observável do sistema]"}
                  rows={5}
                  required
                  className="w-full px-3 py-2.5 bg-surface rounded-lg text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-sans leading-relaxed"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setNewRuleModalOpen(false)} className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-container text-on-surface-variant text-xs font-semibold cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer">
                  Salvar Regra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
