import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../api/client.ts';
import { isJobActive, startEvidenceAudit, useEvaluatingStoryIds, useJobs } from '../api/jobs.ts';
import { formatScore, getDismissedRewrites, pendingRewrite, useStories } from '../api/stories.ts';
import { usePendingSuggestions } from '../api/suggestions.ts';
import { StoryText } from '../components/StoryText.tsx';
import { SuggestionIndicator } from '../components/SuggestionIndicator.tsx';
import { Project, ScreenType, StoryStatus, StorySummary } from '../types.ts';

interface VisaoGeralScreenProps {
  project: Project;
  onSelectStory: (storyId: string) => void;
  onOpenRequirement: (suggestionId: string) => void;
  onNavigate: (screen: ScreenType) => void;
  showToast: (msg: string, icon?: string) => void;
}

const STATUS_FILTERS: Array<{ status: StoryStatus; icon: string }> = [
  { status: 'Em revisão', icon: 'schedule' },
  { status: 'Falta Informação', icon: 'warning' },
  { status: 'Aprovada', icon: 'check_circle' },
  { status: 'Desaprovada', icon: 'cancel' },
];

const STATUS_BADGES: Record<StoryStatus, { className: string; icon: string }> = {
  Aprovada: { className: 'bg-tertiary-fixed text-on-tertiary-fixed-variant border-tertiary/20', icon: 'check_circle' },
  'Falta Informação': { className: 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]', icon: 'warning' },
  Desaprovada: { className: 'bg-error-container text-on-error-container border-error/20', icon: 'cancel' },
  'Em revisão': { className: 'bg-surface-container text-on-surface-variant border-outline-variant/30', icon: 'schedule' },
};

const ID_BADGES: Record<StoryStatus, string> = {
  Aprovada: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  'Falta Informação': 'bg-[#fef3c7] text-[#92400e] border border-[#fde68a]',
  Desaprovada: 'bg-error-container text-on-error-container',
  'Em revisão': 'bg-primary-fixed text-on-primary-fixed',
};

export const VisaoGeralScreen: React.FC<VisaoGeralScreenProps> = ({
  project,
  onSelectStory,
  onOpenRequirement,
  onNavigate,
  showToast,
}) => {
  const queryClient = useQueryClient();
  const { data: jobs = [] } = useJobs(project.id);
  const [isStartingAudit, setIsStartingAudit] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'todos' | StoryStatus>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: stories = [], isPending, error } = useStories(project.id);
  const { data: suggestions = [] } = usePendingSuggestions(project.id);
  const evaluatingIds = useEvaluatingStoryIds(project.id);
  const newRequirements = suggestions.filter((s) => s.storyId === null);
  const suggestionCountByStory = suggestions.reduce<Record<string, number>>((acc, s) => {
    if (s.storyId !== null) acc[s.storyId] = (acc[s.storyId] ?? 0) + 1;
    return acc;
  }, {});
  // Recomendações aguardando avaliação: sugestões de atualização pendentes + a "Sugestão Otimizada" da avaliação.
  const dismissedRewrites = getDismissedRewrites();
  const recommendationCount = (story: StorySummary) =>
    (suggestionCountByStory[story.id] ?? 0) + (pendingRewrite(story, dismissedRewrites) ? 1 : 0);

  const countByStatus = (status: StoryStatus) => stories.filter((s) => s.status === status).length;
  const totalCount = stories.length;
  const approvedCount = countByStatus('Aprovada');
  const pendingCount = countByStatus('Em revisão') + countByStatus('Falta Informação');
  const hasSources = project.audiosCount + project.docsCount > 0;

  // A API não impede dois lotes ao mesmo tempo: o botão fica bloqueado enquanto houver um job de auditoria ativo.
  const auditableCount = totalCount - countByStatus('Desaprovada');
  const isAuditing = isStartingAudit || jobs.some((j) => j.type === 'auditoria_evidencias' && isJobActive(j));
  const handleAuditAll = async () => {
    setIsStartingAudit(true);
    try {
      await startEvidenceAudit(queryClient, project.id);
    } catch (e) {
      showToast(errorMessage(e), 'error');
    } finally {
      setIsStartingAudit(false);
    }
  };

  const search = searchQuery.toLowerCase();
  const filteredStories = stories.filter((s) => {
    const matchesFilter = activeFilter === 'todos' || s.status === activeFilter;
    const matchesSearch = [s.title, s.summary, s.code].some((text) => text.toLowerCase().includes(search));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">User Stories Prontas</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-on-surface tracking-tight">{approvedCount}</span>
              <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant text-xs font-semibold">Aprovadas</span>
            </div>
            <span className="text-xs text-tertiary-container mt-1 flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              {((approvedCount / (totalCount || 1)) * 100).toFixed(1).replace('.', ',')}% do total concluído
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed-variant shadow-xs">
            <span className="material-symbols-outlined text-[26px]">task_alt</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Em Revisão</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-on-surface tracking-tight">{pendingCount}</span>
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-semibold">Pendentes</span>
            </div>
            <span className="text-xs text-primary mt-1 flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[16px]">pending_actions</span>
              Aguardando aprovação
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed shadow-xs">
            <span className="material-symbols-outlined text-[26px]">hourglass_empty</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Análise Geral</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span data-testid="qualidade-projeto" className="text-3xl font-bold text-on-surface tracking-tight">{formatScore(project.qualityScore)}</span>
            </div>
            <span className="text-xs text-secondary mt-1 flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              Qualidade do Backlog: {project.qualityLabel}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed shadow-xs">
            <span className="material-symbols-outlined text-[26px]">auto_awesome</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 w-full">
        {/* Ações em lote sobre o backlog. "Analisar todas" ainda está em desenvolvimento (desabilitado). */}
        <div className="bg-white rounded-xl p-4 shadow-xs border border-surface-container flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">rule_settings</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-on-surface">Ações da Tarefa</span>
              <span className="text-xs text-on-surface-variant">Analise a qualidade ou audite as evidências de todas as User Stories do backlog</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" disabled title="Em desenvolvimento" className="px-3.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary text-xs font-semibold border border-surface-container transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              <span>Analisar todas</span>
            </button>
            <button
              type="button"
              onClick={handleAuditAll}
              disabled={isAuditing || auditableCount === 0}
              title={auditableCount > 0 ? `Audita as evidências de ${auditableCount} User Story(ies); roda em segundo plano` : 'Nenhuma User Story para auditar'}
              className="px-3.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary text-xs font-semibold border border-surface-container transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[18px] ${isAuditing ? 'animate-spin' : ''}`}>{isAuditing ? 'progress_activity' : 'policy'}</span>
              <span>{isAuditing ? 'Auditando...' : 'Auditar todas'}</span>
            </button>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-outline-variant/30 shadow-xs flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-outline-variant/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">format_list_bulleted</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">Backlog</h3>
                <p className="text-xs text-on-surface-variant">O que o sistema deve fazer explicado passo a passo</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveFilter('todos')}
                className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === 'todos' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span>Todos os Status</span>
                <span className={`px-1.5 rounded-full text-[11px] font-bold ${activeFilter === 'todos' ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>
                  {totalCount}
                </span>
              </button>
              {STATUS_FILTERS.map(({ status, icon }) => (
                <button
                  key={status}
                  onClick={() => setActiveFilter(status)}
                  className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeFilter === status ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">{icon}</span>
                  <span>{status}</span>
                  <span className="px-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-semibold">{countByStatus(status)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por palavras-chave ou código..."
              className="w-full pl-9 pr-4 py-2 bg-surface-container-low rounded-lg text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            {isPending && <p role="status" className="p-6 text-center text-xs text-on-surface-variant">Carregando histórias...</p>}
            {error && <p role="alert" className="p-6 text-center text-xs text-error">{errorMessage(error)}</p>}

            {newRequirements.map((requirement) => (
              <div key={requirement.id} data-testid="novo-requisito" className="p-4 rounded-xl bg-primary-fixed/20 border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-on-primary text-[11px] font-semibold">
                    <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                    Sugestão da IA
                  </span>
                  {requirement.temporaryId && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface text-[11px] font-mono font-semibold">{requirement.temporaryId}</span>
                  )}
                  {requirement.possibleDuplicates.length > 0 && (
                    <span className="ml-1.5 text-[11px] text-[#92400e]" title="Confira antes de aprovar">possível duplicidade com {requirement.possibleDuplicates.map((d) => d.code).join(', ')}</span>
                  )}
                  <h4 className="text-sm font-bold text-on-surface truncate mt-1.5">{requirement.proposedTitle}</h4>
                  <p className="text-xs text-on-surface-variant truncate mt-0.5"><StoryText text={requirement.proposedText} /></p>
                </div>
                <button
                  onClick={() => onOpenRequirement(requirement.id)}
                  className="h-8 px-4 rounded-lg bg-surface-container hover:bg-primary hover:text-white text-on-surface text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <span>Ver sugestão</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            ))}

            {filteredStories.map((story) => (
              <div
                key={story.id}
                data-testid="story-row"
                className="p-4 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low transition-all shadow-xs border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className={`min-w-16 px-2 shrink-0 flex items-center justify-center py-1 rounded text-xs font-bold font-mono ${ID_BADGES[story.status]}`}>
                    {story.code}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">{story.title}</h4>
                    <p className="text-xs text-on-surface-variant truncate mt-0.5"><StoryText text={story.summary} /></p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <SuggestionIndicator count={recommendationCount(story)} loading={evaluatingIds.has(story.id)} />
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border ${STATUS_BADGES[story.status].className}`}>
                      <span className="material-symbols-outlined text-[14px]">{STATUS_BADGES[story.status].icon}</span>
                      {story.status}
                    </span>
                  </div>
                  <button
                    onClick={() => onSelectStory(story.id)}
                    className="h-8 px-4 rounded-lg bg-surface-container hover:bg-primary hover:text-white text-on-surface text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Ver análise</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            ))}

            {!isPending && !error && totalCount === 0 && newRequirements.length === 0 && (
              <div className="p-8 text-center bg-surface-container-low rounded-xl text-xs text-on-surface-variant flex flex-col items-center gap-3">
                <span>
                  {hasSources
                    ? 'Este projeto ainda não tem User Stories. Crie as tarefas a partir das fontes já enviadas.'
                    : 'Este projeto ainda não tem User Stories. Adicione áudios ou documentos para criá-las.'}
                </span>
                <button
                  onClick={() => onNavigate(hasSources ? 'projeto-fontes' : 'projeto-ingestao')}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
                >
                  {hasSources ? 'Ver Fontes' : 'Adicionar Fontes'}
                </button>
              </div>
            )}

            {totalCount > 0 && filteredStories.length === 0 && (
              <div className="p-8 text-center bg-surface-container-low rounded-xl text-xs text-on-surface-variant">
                Nenhuma User Story encontrada para este filtro.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 text-on-surface-variant text-xs border-t border-outline-variant/20">
            <span>Mostrando {filteredStories.length} de {totalCount} User Stories</span>
          </div>
        </div>
      </section>
    </div>
  );
};
