import React, { useState } from 'react';
import { UserStory, ScreenType, TestCriterion } from '../types.ts';

const SYSTEM_PREFIX = 'o sistema deve';
const TOTAL_CRITERIA = 13;
const SIMULATED_ANALYSIS_MS = 1200;
const SIMULATED_CRITERIA_GAIN = 2;

const parseStoryText = (text: string) => {
  const match = text.match(/^Como (.+?), eu quero (.+?), para que (.+?)\.?$/);
  return match ? { actor: match[1], action: match[2], benefit: match[3] } : null;
};

const qualityLabelFor = (score: number) => {
  if (score >= 100) return 'Excelente';
  if (score >= 75) return 'Alta';
  if (score >= 50) return 'Regular';
  if (score >= 25) return 'Baixa';
  return 'Péssima';
};

// Simula a avaliação QUS da API: a nota é critérios atendidos / 13 x 100.
const simulateEvaluation = (story: UserStory, criteriaGained: number): UserStory => {
  const met = Math.min(TOTAL_CRITERIA, Math.round((story.qualityScore * TOTAL_CRITERIA) / 100) + criteriaGained);
  const qualityScore = Math.round((met * 10000) / TOTAL_CRITERIA) / 100;
  let remaining = criteriaGained;
  const heuristics = story.heuristics.map((h) => {
    if (remaining > 0 && h.status === 'Atenção') {
      remaining -= 1;
      return { ...h, status: 'Atendido' as const };
    }
    return h;
  });
  return { ...story, qualityScore, qualityLabel: qualityLabelFor(qualityScore), qualityOutdated: false, heuristics };
};

interface AvaliacaoQualidadeScreenProps {
  story: UserStory;
  allStories: UserStory[];
  onSelectStory: (story: UserStory) => void;
  onUpdateStory: (updated: UserStory) => void;
  onNavigate: (screen: ScreenType) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const AvaliacaoQualidadeScreen: React.FC<AvaliacaoQualidadeScreenProps> = ({
  story,
  allStories,
  onSelectStory,
  onUpdateStory,
  onNavigate,
  showToast,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const hasPendingSuggestion = !story.suggestionApplied && !story.suggestionRejected;
  const suggestionParts = parseStoryText(story.optimizedText);
  const [comoInput, setComoInput] = useState(story.actor || '');
  const [queroInput, setQueroInput] = useState(story.action || '');
  const [paraInput, setParaInput] = useState(story.benefit || '');

  React.useEffect(() => {
    setComoInput(story.actor || '');
    setQueroInput(story.action || '');
    setParaInput(story.benefit || '');
  }, [story]);

  // New Test Criterion Modal state
  const [newRuleModalOpen, setNewRuleModalOpen] = useState(false);
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleCriterion, setNewRuleCriterion] = useState('');

  // Audio preview playing & pointer state
  const [isPlayingSnippet, setIsPlayingSnippet] = useState(false);
  const [snippetProgress, setSnippetProgress] = useState(38); // percentage
  const [isEditingAudioSource, setIsEditingAudioSource] = useState(false);
  const [audioSourceTimestamp, setAudioSourceTimestamp] = useState(story.sources.audio?.timestamp || '');
  const [audioSourceQuote, setAudioSourceQuote] = useState(story.sources.audio?.quote || '');

  React.useEffect(() => {
    setAudioSourceTimestamp(story.sources.audio?.timestamp || '');
    setAudioSourceQuote(story.sources.audio?.quote || '');
  }, [story]);

  // Handle structured edit save
  const handleSaveStructured = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comoInput.trim() && !queroInput.trim() && !paraInput.trim()) return;

    const actorVal = comoInput.trim();
    const actionVal = queroInput.trim();
    const benefitVal = paraInput.trim();

    const fullStory = `“Como ${actorVal}, quero ${actionVal}, para ${benefitVal}.”`;

    const newVersion = {
      version: `v${(parseFloat(story.versions[0]?.version.replace('v', '') || '1.0') + 0.1).toFixed(1)}`,
      type: 'Alteração Manual',
      timestamp: 'Hoje, há instantes',
      text: fullStory,
      isCurrent: true,
    };

    const updatedVersions = [
      newVersion,
      ...story.versions.map((v) => ({ ...v, isCurrent: false })),
    ];

    onUpdateStory({
      ...story,
      actor: actorVal,
      action: actionVal,
      benefit: benefitVal,
      originalText: fullStory,
      versions: updatedVersions,
      qualityOutdated: true,
    });

    setIsEditing(false);
    showToast('User Story atualizada com sucesso!');
  };

  // Apply optimized suggestion
  const handleApplySuggestion = () => {
    const newVersion = {
      version: `v${(parseFloat(story.versions[0]?.version.replace('v', '') || '1.0') + 0.1).toFixed(1)}`,
      type: 'Sugestão Otimizada (IA)',
      timestamp: 'Hoje, há instantes',
      text: `“${story.optimizedText}”`,
      isCurrent: true,
    };

    const updatedVersions = [
      newVersion,
      ...story.versions.map((v) => ({ ...v, isCurrent: false })),
    ];

    const applied: UserStory = {
      ...story,
      ...suggestionParts,
      originalText: `“${story.optimizedText}”`,
      suggestionApplied: true,
      versions: updatedVersions,
      qualityOutdated: true,
    };
    onUpdateStory(applied);

    // A nota vem de uma nova avaliação dos 13 critérios, nunca de um valor fixo.
    setIsAnalyzing(true);
    showToast('Sugestão aplicada. Reavaliando os 13 critérios...', 'sync');
    setTimeout(() => {
      const evaluated = simulateEvaluation(applied, SIMULATED_CRITERIA_GAIN);
      onUpdateStory(evaluated);
      setIsAnalyzing(false);
      showToast(`Reavaliação concluída: qualidade de ${story.qualityScore}% para ${evaluated.qualityScore}%.`, 'verified');
    }, SIMULATED_ANALYSIS_MS);
  };

  const handleRejectSuggestion = () => {
    onUpdateStory({ ...story, suggestionRejected: true });
    showToast('Sugestão rejeitada. A User Story foi mantida.');
  };

  // Add rule
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleCriterion.trim()) return;

    const newCriterion: TestCriterion = {
      id: `crit-${Date.now()}`,
      number: story.criteria.length + 1,
      title: newRuleTitle.trim() || `Critério ${story.criteria.length + 1}`,
      category: 'Critério de Aceite',
      when: newRuleCriterion.trim(),
      then: '',
    };

    onUpdateStory({
      ...story,
      criteria: [...story.criteria, newCriterion],
      qualityOutdated: true,
    });

    setNewRuleModalOpen(false);
    setNewRuleTitle('');
    setNewRuleCriterion('');
    showToast('Novo critério de aceite adicionado!');
  };

  const handleDeleteRule = (id: string) => {
    onUpdateStory({
      ...story,
      criteria: story.criteria.filter((c) => c.id !== id),
      qualityOutdated: true,
    });
    showToast('Critério removido.');
  };

  const handleStatusChange = (newStatus: 'Aprovada' | 'Desaprovada') => {
    onUpdateStory({
      ...story,
      status: newStatus,
    });
    showToast(`Status da User Story alterado para: ${newStatus}`);
  };

  const handleRunAudit = () => {
    setIsAnalyzing(true);
    showToast('Analisando os 13 critérios QUS...', 'sync');
    setTimeout(() => {
      const evaluated = simulateEvaluation(story, 0);
      onUpdateStory(evaluated);
      setIsAnalyzing(false);
      showToast(`Análise concluída: qualidade de ${evaluated.qualityScore}%.`, 'verified');
    }, SIMULATED_ANALYSIS_MS);
  };

  return (
    <div className="w-full bg-surface pb-16">
      {/* Top Utility Bar / Header Section */}
      <section className="w-full py-6 bg-white shadow-xs border-b border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-4">
          {/* Breadcrumb & Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <button
                onClick={() => onNavigate('visao-geral')}
                className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Backlog</span>
              </button>
              <span className="text-outline-variant">/</span>
              <span className="text-primary">{story.id} Revisão de Clareza</span>
            </div>

            {/* Quick Story Switcher Dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={story.id}
                disabled={isAnalyzing}
                onChange={(e) => {
                  const found = allStories.find((s) => s.id === e.target.value);
                  if (found) onSelectStory(found);
                }}
                className="px-2.5 py-1 rounded-lg bg-surface border border-outline-variant/30 text-xs font-semibold text-on-surface focus:outline-none"
              >
                {allStories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} - {s.title}
                  </option>
                ))}
              </select>

              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${
                story.status === 'Aprovada'
                  ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                  : story.status === 'Desaprovada'
                  ? 'bg-error-container text-on-error-container'
                  : 'bg-primary-fixed text-on-primary-fixed'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current inline-block"></span>
                {story.status}
              </span>
            </div>
          </div>

          {/* Title, Edit Button, and Quality Score */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container pb-4">
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded bg-primary text-on-primary text-xs font-bold font-mono">
                    {story.id}
                  </span>
                  <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
                    {story.title}
                  </h1>
                </div>

                {!isEditing && (
                  <button
                    onClick={() => {
                      setComoInput(story.actor || '');
                      setQueroInput(story.action || '');
                      setParaInput(story.benefit || '');
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

              {/* Display text */}
              {!isEditing && (
                <p className="text-sm text-on-surface-variant italic mt-1 leading-relaxed">
                  {story.originalText}
                </p>
              )}

              {/* Inline Structured Editor */}
              {isEditing && (
                <form
                  onSubmit={handleSaveStructured}
                  className="mt-2 p-4 bg-surface-container-low rounded-xl border border-primary/20 flex flex-col gap-3 shadow-xs"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-surface-container">
                    <span className="text-xs text-primary font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">tune</span>
                      Edição da User Story
                    </span>
                    <span className="text-[11px] text-outline">Formato Ágil</span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="input-story-como" className="text-xs font-semibold text-on-surface">
                        Como
                      </label>
                      <input
                        id="input-story-como"
                        type="text"
                        value={comoInput}
                        onChange={(e) => setComoInput(e.target.value)}
                        placeholder="Ex: cliente correntista"
                        required
                        className="w-full px-3.5 py-2 text-xs bg-white border border-surface-container rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface shadow-xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="input-story-quero" className="text-xs font-semibold text-on-surface">
                        Quero
                      </label>
                      <input
                        id="input-story-quero"
                        type="text"
                        value={queroInput}
                        onChange={(e) => setQueroInput(e.target.value)}
                        placeholder="Ex: entrar no aplicativo usando reconhecimento facial"
                        required
                        className="w-full px-3.5 py-2 text-xs bg-white border border-surface-container rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface shadow-xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="input-story-para" className="text-xs font-semibold text-on-surface">
                        Para
                      </label>
                      <input
                        id="input-story-para"
                        type="text"
                        value={paraInput}
                        onChange={(e) => setParaInput(e.target.value)}
                        placeholder="Ex: acessar a conta rapidamente sem digitar senha"
                        required
                        className="w-full px-3.5 py-2 text-xs bg-white border border-surface-container rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3.5 py-1.5 rounded-lg border border-surface-container bg-white hover:bg-surface-container text-on-surface-variant text-xs font-semibold transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Quality Score Counter */}
            <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
              <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2.5 rounded-xl border border-surface-container">
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">
                    Qualidade da User Story
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-2xl font-bold text-primary">{story.qualityScore}%</span>
                    <span className="px-2 py-0.5 rounded bg-primary-fixed text-primary text-[11px] font-semibold">
                      {story.qualityLabel}
                    </span>
                    {story.qualityOutdated && (
                      <span
                        className="px-2 py-0.5 rounded bg-[#fef3c7] text-[#92400e] text-[11px] font-semibold"
                        title="A User Story mudou desde a última análise. Use Analisar a qualidade."
                      >
                        {isAnalyzing ? 'Reavaliando...' : 'Desatualizada'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Ações da Tarefa Bar (Top) */}
        <div className="bg-white rounded-xl p-4 shadow-xs border border-surface-container flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">rule_settings</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-on-surface">Ações da Tarefa</span>
              <span className="text-xs text-on-surface-variant">
                Defina a aprovação ou execute nova verificação dos requisitos
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRunAudit}
              disabled={isAnalyzing}
              type="button"
              className="px-3.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary text-xs font-semibold border border-surface-container transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              <span>Analisar a qualidade</span>
            </button>
            <button
              onClick={() => handleStatusChange('Desaprovada')}
              type="button"
              className="px-3.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-error text-xs font-semibold border border-surface-container transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">thumb_down</span>
              <span>Desaprovar</span>
            </button>
            <button
              onClick={() => handleStatusChange('Aprovada')}
              type="button"
              className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>Aprovar</span>
            </button>
          </div>
        </div>

        {/* Critérios de Teste (Regras Simples) */}
        <section className="bg-white rounded-xl p-6 shadow-xs border border-surface-container flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-surface-container">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">checklist</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-on-surface">Critérios de Teste (Regras Simples)</h2>
                <p className="text-xs text-on-surface-variant">Critérios objetivos no formato [Quando... o sistema deve...]</p>
              </div>
            </div>
            <button
              onClick={() => setNewRuleModalOpen(true)}
              type="button"
              className="px-3.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary text-xs font-semibold flex items-center gap-1 border border-surface-container transition-colors shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Adicionar Regra</span>
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {story.criteria.map((criterion, idx) => (
              <div
                key={criterion.id}
                className="bg-surface-container-low rounded-xl p-4 border border-surface-container flex items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-on-surface">{criterion.title}</span>
                    </div>
                    <p className="text-xs text-on-surface leading-relaxed mt-0.5 whitespace-pre-line">
                      {criterion.then ? (
                        <>
                          <strong className="text-primary font-semibold">Quando</strong> {criterion.when},{' '}
                          {criterion.then.startsWith(SYSTEM_PREFIX) ? (
                            <>
                              <strong className="text-secondary font-semibold">{SYSTEM_PREFIX}</strong>
                              {criterion.then.slice(SYSTEM_PREFIX.length)}
                            </>
                          ) : (
                            criterion.then
                          )}
                        </>
                      ) : (
                        criterion.when
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                  <button
                    onClick={() => handleDeleteRule(criterion.id)}
                    title="Excluir regra"
                    type="button"
                    className="text-outline hover:text-error p-1 rounded transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete_outline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sugestão de Melhoria de Texto */}
        <section className="bg-white rounded-xl p-6 shadow-xs border border-surface-container flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-surface-container">
            <div>
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">compare_arrows</span>
                <span>Sugestão de Melhoria de Texto</span>
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Comparação direta para eliminar ambiguidades mantendo o objetivo original (Heurística 8 & 9)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRejectSuggestion}
                disabled={!hasPendingSuggestion || isAnalyzing}
                type="button"
                className="px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-error text-xs font-semibold flex items-center gap-1.5 border border-surface-container transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                <span>Rejeitar</span>
              </button>
              <button
                onClick={handleApplySuggestion}
                disabled={!hasPendingSuggestion || isAnalyzing}
                type="button"
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">check</span>
                <span>Aplicar Sugestão</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Versão Atual */}
            <div className="bg-surface-container-low rounded-xl p-4 border border-surface-container flex flex-col gap-2">
              <span className="text-[11px] text-outline font-semibold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">history</span>
                Versão Atual (Original)
              </span>
              <p className="text-xs text-on-surface italic leading-relaxed pt-1 bg-white p-3 rounded-lg border border-surface-container">
                {story.originalText}
              </p>
              {hasPendingSuggestion && (
                <span className="text-xs text-secondary flex items-center gap-1 pt-1">
                  <span className="material-symbols-outlined text-[15px]">error_outline</span>
                  {story.ambiguityNotice}
                </span>
              )}
            </div>

            {/* Sugestão Otimizada */}
            <div className="bg-primary-fixed/20 rounded-xl p-4 border border-primary/30 flex flex-col gap-2">
              <span className="text-[11px] text-primary font-semibold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                Sugestão Otimizada (Recomendada)
              </span>
              {hasPendingSuggestion ? (
                <>
                  <div className="text-xs text-on-surface leading-relaxed pt-1 bg-white p-3 rounded-lg border border-primary/20">
                    {suggestionParts ? (
                      <>
                        <strong className="text-primary font-bold">Como</strong> {suggestionParts.actor},{' '}
                        <strong className="text-tertiary font-bold">eu quero</strong> {suggestionParts.action},{' '}
                        <strong className="text-secondary font-bold">para que</strong> {suggestionParts.benefit}.
                      </>
                    ) : (
                      story.optimizedText
                    )}
                  </div>
                  <span className="text-xs text-tertiary flex items-center gap-1 pt-1 font-medium">
                    <span className="material-symbols-outlined text-[15px]">check_circle</span>
                    {story.optimizedBenefit}
                  </span>
                </>
              ) : (
                <div className="text-xs text-on-surface-variant leading-relaxed pt-1 bg-white p-3 rounded-lg border border-primary/20">
                  Nenhuma sugestão pendente para esta User Story.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Attention Gap Warning Banner (Links directly to Screen 3 Follow-up!) */}
        {story.hasAttentionGap && (
          <div className="p-4 bg-[#fffbeb] border border-[#fcd34d] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#fef3c7] text-[#d97706] flex items-center justify-center shrink-0 mt-0.5 border border-[#fde68a]">
                <span className="material-symbols-outlined text-[20px]">warning</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#78350f]">
                    Atenção: Falta de Informação nas Fontes
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-[#fef3c7] text-[#92400e] border border-[#fde68a] text-[11px] font-semibold">
                    Pendência Identificada
                  </span>
                </div>
                <p className="text-xs text-[#92400e] leading-relaxed">
                  {story.attentionGapMessage ||
                    'Identificamos lacunas e detalhes pendentes nesta tarefa que não foram esclarecidos nas entrevistas nem nos documentos fornecidos.'}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center">
              <button
                onClick={() => onNavigate('follow-up')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">quiz</span>
                <span>Resolver em Perguntas de Follow-up</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Origem e Rastreabilidade das Fontes */}
        <section className="bg-white rounded-xl p-6 shadow-xs border border-surface-container flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-surface-container">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">account_tree</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-on-surface">Origem e Rastreabilidade das Fontes</h2>
                <p className="text-xs text-on-surface-variant">De onde as informações desta tarefa foram extraídas</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-surface-container-low text-on-surface-variant text-xs font-semibold flex items-center gap-1 border border-surface-container">
              <span className="material-symbols-outlined text-[14px] text-primary">verified</span>
              2 Fontes Conectadas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Audio Source with Playhead Pointer & Transcription Edit */}
            {story.sources.audio && (
              <div className="bg-surface-container-low rounded-xl p-4 border border-surface-container flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] text-primary font-semibold uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">mic</span>
                      Áudio de Origem
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingAudioSource(!isEditingAudioSource)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-surface-container border border-surface-container text-primary text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer"
                        title="Editar transcrição deste trecho"
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {isEditingAudioSource ? 'close' : 'edit'}
                        </span>
                        <span>{isEditingAudioSource ? 'Cancelar' : 'Editar Trecho'}</span>
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-on-surface">{story.sources.audio.title}</h3>

                  {/* Normal View: Clickable quote to reposition playhead */}
                  {!isEditingAudioSource ? (
                    <div
                      onClick={() => {
                        setIsPlayingSnippet(true);
                        setSnippetProgress(45);
                        showToast(`Ponteiro reposicionado para ${story.sources.audio?.timestamp} — reproduzindo`, 'play_circle');
                      }}
                      className="bg-white p-3 rounded-lg border border-surface-container text-xs text-on-surface-variant leading-relaxed cursor-pointer hover:border-primary/40 hover:bg-primary-fixed/10 transition-all group"
                      title="Clique no trecho para reposicionar o ponteiro do áudio e ouvir a gravação"
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <strong className="text-primary font-bold font-mono text-[11px] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">schedule</span>
                          {story.sources.audio.timestamp}
                        </strong>
                        <span className="text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-primary font-medium">
                          <span className="material-symbols-outlined text-[13px]">play_circle</span>
                          Clique para ouvir
                        </span>
                      </div>
                      <span className="italic text-on-surface">{story.sources.audio.quote}</span>
                    </div>
                  ) : (
                    /* Edit View: Edit timestamp and transcribed speech quote */
                    <div className="bg-white p-3 rounded-lg border border-primary/30 flex flex-col gap-2 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-on-surface">Timestamp:</span>
                        <input
                          type="text"
                          value={audioSourceTimestamp}
                          onChange={(e) => setAudioSourceTimestamp(e.target.value)}
                          placeholder="Timestamp 05:40"
                          className="flex-1 px-2.5 py-1 text-xs bg-surface border border-outline-variant/30 rounded focus:outline-none focus:ring-1 focus:ring-primary/40 font-mono text-primary font-bold"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold text-on-surface">Trecho Transcrito:</span>
                        <textarea
                          value={audioSourceQuote}
                          onChange={(e) => setAudioSourceQuote(e.target.value)}
                          rows={3}
                          placeholder="Texto transcrito da reunião..."
                          className="w-full p-2 text-xs bg-surface border border-outline-variant/30 rounded focus:outline-none focus:ring-1 focus:ring-primary/40 text-on-surface resize-none leading-relaxed"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1 border-t border-outline-variant/20">
                        <button
                          type="button"
                          onClick={() => setIsEditingAudioSource(false)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant hover:bg-surface-container rounded transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!story.sources.audio) return;
                            onUpdateStory({
                              ...story,
                              sources: {
                                ...story.sources,
                                audio: {
                                  ...story.sources.audio,
                                  timestamp: audioSourceTimestamp.trim(),
                                  quote: audioSourceQuote.trim(),
                                },
                              },
                            });
                            setIsEditingAudioSource(false);
                            showToast('Trecho da transcrição atualizado com sucesso!');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded bg-primary text-white text-[11px] font-semibold shadow-xs hover:bg-primary-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-[13px]">check</span>
                          <span>Salvar Trecho</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Scrubber Bar with Playhead Pointer */}
                  <div className="bg-white rounded-lg p-2.5 border border-surface-container flex items-center gap-2.5 shadow-2xs">
                    <button
                      onClick={() => {
                        setIsPlayingSnippet(!isPlayingSnippet);
                        showToast(isPlayingSnippet ? 'Áudio pausado' : 'Reproduzindo trecho de voz...', 'play_circle');
                      }}
                      type="button"
                      className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-container transition-colors shrink-0 shadow-2xs cursor-pointer"
                      title={isPlayingSnippet ? 'Pausar trecho' : 'Ouvir trecho'}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isPlayingSnippet ? 'pause' : 'play_arrow'}
                      </span>
                    </button>

                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-mono">
                        <span className="font-semibold text-primary">{story.sources.audio.timestamp}</span>
                        <span>{story.sources.audio.durationLabel}</span>
                      </div>

                      {/* Scrubber track & pointer */}
                      <div
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                          const pct = Math.round((clickX / rect.width) * 100);
                          setSnippetProgress(pct);
                          showToast(`Ponteiro reposicionado para ${pct}% do trecho`, 'schedule');
                        }}
                        className="relative w-full h-2 bg-surface-container-highest rounded-full cursor-pointer flex items-center group/track"
                        title="Clique para reposicionar o ponteiro"
                      >
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-150"
                          style={{ width: `${snippetProgress}%` }}
                        ></div>
                        <div
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-primary rounded-full shadow-sm pointer-events-none transition-all duration-150 group-hover/track:scale-125"
                          style={{ left: `${snippetProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-tertiary">check_circle</span>
                    Voz confirmada pela IA
                  </span>
                  <button
                    onClick={() => onNavigate('projeto-fontes')}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver transcrição inteira</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

            {/* Document Source */}
            {story.sources.doc && (
              <div className="bg-surface-container-low rounded-xl p-4 border border-surface-container flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-secondary font-semibold uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">description</span>
                      Documento de Origem
                    </span>
                    <span className="px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed-variant text-[11px] font-semibold">
                      {story.sources.doc.page}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-on-surface">{story.sources.doc.title}</h3>
                  <div className="bg-white p-3 rounded-lg border border-surface-container text-xs text-on-surface-variant leading-relaxed">
                    <strong className="text-on-surface font-semibold">{story.sources.doc.page}</strong>:{' '}
                    <span className="italic">{story.sources.doc.quote}</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <button
                    onClick={() => onNavigate('projeto-fontes')}
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-surface-container border border-surface-container text-primary text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    <span>Ver no documento</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Análise de Qualidade da User Story (13 Heurísticas QUS & INVEST) */}
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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-0.5 rounded-full bg-tertiary/10 text-tertiary text-xs font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                10 Aprovados
              </span>
              <span className="px-3 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant text-xs font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">warning</span>
                3 Requerem Atenção
              </span>
            </div>
          </div>

          <div className="p-3 bg-primary-fixed/20 border border-primary/20 rounded-xl flex items-start gap-3 text-xs text-on-surface leading-relaxed">
            <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">psychology</span>
            <div>
              <strong className="text-primary font-bold">Ajuda Inteligente:</strong> Analisamos a escrita para
              garantir que nenhuma dúvida fique para trás. As dicas abaixo mostram onde pequenos ajustes tornam a
              entrega mais rápida para todo mundo.
            </div>
          </div>

          {/* 3 Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category 1: Estrutura do Texto */}
            <div className="bg-surface-container-low rounded-xl p-4 border border-surface-container flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-surface-container pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">spellcheck</span>
                  <span className="text-xs font-bold text-on-surface">1. Estrutura do Texto</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[11px] font-semibold">
                  3 Critérios
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {story.heuristics
                  .filter((h) => h.category === '1. Estrutura do Texto')
                  .map((h) => (
                    <div
                      key={h.id}
                      className={`p-2.5 rounded-lg border flex flex-col gap-1 transition-all ${
                        h.status === 'Atenção'
                          ? 'bg-secondary-fixed/15 border-secondary-fixed/40'
                          : 'bg-white border-surface-container'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold ${
                            h.status === 'Atenção' ? 'text-secondary font-bold' : 'text-on-surface'
                          }`}
                        >
                          {h.name}
                        </span>
                        <span
                          className={`text-[11px] font-semibold flex items-center gap-0.5 ${
                            h.status === 'Atenção' ? 'text-secondary' : 'text-tertiary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {h.status === 'Atenção' ? 'warning' : 'check'}
                          </span>
                          {h.status}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">{h.description}</p>
                      {h.tip && (
                        <span className="text-[11px] text-secondary font-medium mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                          {h.tip}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Category 2: Sentido e Negócio */}
            <div className="bg-surface-container-low rounded-xl p-4 border border-surface-container flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-surface-container pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-[18px]">chat</span>
                  <span className="text-xs font-bold text-on-surface">2. Sentido e Negócio</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[11px] font-semibold">
                  4 Critérios
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {story.heuristics
                  .filter((h) => h.category === '2. Sentido e Negócio')
                  .map((h) => (
                    <div
                      key={h.id}
                      className={`p-2.5 rounded-lg border flex flex-col gap-1 transition-all ${
                        h.status === 'Atenção'
                          ? 'bg-secondary-fixed/15 border-secondary-fixed/40'
                          : 'bg-white border-surface-container'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold ${
                            h.status === 'Atenção' ? 'text-secondary font-bold' : 'text-on-surface'
                          }`}
                        >
                          {h.name}
                        </span>
                        <span
                          className={`text-[11px] font-semibold flex items-center gap-0.5 ${
                            h.status === 'Atenção' ? 'text-secondary' : 'text-tertiary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {h.status === 'Atenção' ? 'warning' : 'check'}
                          </span>
                          {h.status}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">{h.description}</p>
                      {h.tip && (
                        <span className="text-[11px] text-secondary font-medium mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                          {h.tip}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Category 3: Prática e Execução */}
            <div className="bg-surface-container-low rounded-xl p-4 border border-surface-container flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-surface-container pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-tertiary text-[18px]">verified</span>
                  <span className="text-xs font-bold text-on-surface">3. Prática e Execução</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[11px] font-semibold">
                  6 Critérios
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {story.heuristics
                  .filter((h) => h.category === '3. Prática e Execução')
                  .map((h) => (
                    <div
                      key={h.id}
                      className={`p-2.5 rounded-lg border flex flex-col gap-1 transition-all ${
                        h.status === 'Atenção'
                          ? 'bg-secondary-fixed/15 border-secondary-fixed/40'
                          : 'bg-white border-surface-container'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold ${
                            h.status === 'Atenção' ? 'text-secondary font-bold' : 'text-on-surface'
                          }`}
                        >
                          {h.name}
                        </span>
                        <span
                          className={`text-[11px] font-semibold flex items-center gap-0.5 ${
                            h.status === 'Atenção' ? 'text-secondary' : 'text-tertiary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {h.status === 'Atenção' ? 'warning' : 'check'}
                          </span>
                          {h.status}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">{h.description}</p>
                      {h.tip && (
                        <span className="text-[11px] text-secondary font-medium mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                          {h.tip}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </section>

        {/* Histórico de Versões */}
        <section className="bg-white rounded-xl p-6 shadow-xs border border-surface-container flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-surface-container">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">history</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-on-surface">Histórico de Versões</h2>
                <p className="text-xs text-on-surface-variant">Acompanhe as mudanças feitas nesta tarefa ao longo do tempo</p>
              </div>
            </div>
            <button
              onClick={() => showToast('Exibindo todo o registro histórico da tarefa.')}
              className="px-3.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary text-xs font-semibold flex items-center gap-1 border border-surface-container transition-colors shadow-xs cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>Ver todas as alterações</span>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {story.versions.map((ver, idx) => (
              <div
                key={idx}
                className={`bg-surface-container-low rounded-xl p-4 border flex flex-col gap-2 shadow-xs ${
                  ver.isCurrent ? 'border-primary/30' : 'border-surface-container'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                        ver.isCurrent ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface'
                      }`}
                    >
                      {ver.version}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 ${
                        ver.isCurrent
                          ? 'bg-primary/10 text-primary'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {ver.type.includes('IA') ? 'smart_toy' : 'person'}
                      </span>
                      {ver.type}
                    </span>
                  </div>
                  <span className="text-xs text-outline font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    {ver.timestamp}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-surface-container mt-1">
                  <p className="text-xs text-on-surface leading-relaxed">{ver.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Modal: + Adicionar Regra de Teste */}
      {newRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#213145]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[24px]">add_task</span>
                <h2 className="text-lg font-bold text-on-surface">Adicionar Critério de Teste</h2>
              </div>
              <button
                onClick={() => setNewRuleModalOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant">
              Estruture o critério no formato padrão de aceitação: <strong>Quando</strong> [ação/evento],{' '}
              <strong>o sistema deve</strong> [comportamento esperado].
            </p>

            <form onSubmit={handleAddRule} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface">Título da Regra</label>
                <input
                  type="text"
                  value={newRuleTitle}
                  onChange={(e) => setNewRuleTitle(e.target.value)}
                  placeholder="Ex: Tempo de Resposta, Limite Noturno"
                  required
                  className="w-full px-3 py-2 bg-surface rounded-lg text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface">Critério de aceite</label>
                <textarea
                  value={newRuleCriterion}
                  onChange={(e) => setNewRuleCriterion(e.target.value)}
                  placeholder={"Estrutura Gherkin (Dado / Quando / Então):\n• Dado que [contexto ou estado inicial do sistema]\n• Quando [a ação executada pelo usuário]\n• Então [o resultado esperado e observável do sistema]"}
                  rows={5}
                  required
                  className="w-full px-3 py-2.5 bg-surface rounded-lg text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-sans leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setNewRuleModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-container text-on-surface-variant text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-xs"
                >
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
