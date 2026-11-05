import React, { useState } from 'react';
import { UserStory, StoryStatus, ScreenType } from '../types.ts';

interface VisaoGeralScreenProps {
  stories: UserStory[];
  onSelectStory: (story: UserStory) => void;
  onNavigate: (screen: ScreenType) => void;
}

export const VisaoGeralScreen: React.FC<VisaoGeralScreenProps> = ({
  stories,
  onSelectStory,
  onNavigate,
}) => {
  const [activeFilter, setActiveFilter] = useState<'todos' | StoryStatus>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Counts
  const totalCount = stories.length;
  const approvedCount = stories.filter((s) => s.status === 'Aprovada').length;
  const reviewCount = stories.filter((s) => s.status === 'Em revisão').length;
  const missingInfoCount = stories.filter((s) => s.status === 'Falta Informação').length;
  const rejectedCount = stories.filter((s) => s.status === 'Desaprovada').length;

  const averageQuality = totalCount
    ? Math.round(stories.reduce((sum, s) => sum + s.qualityScore, 0) / totalCount)
    : null;

  const filteredStories = stories.filter((s) => {
    const matchesFilter = activeFilter === 'todos' ? true : s.status === activeFilter;
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: StoryStatus) => {
    switch (status) {
      case 'Aprovada':
        return (
          <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant text-xs font-semibold flex items-center gap-1 border border-tertiary/20">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Aprovada
          </span>
        );
      case 'Falta Informação':
        return (
          <span className="px-2.5 py-1 rounded-full bg-[#fef3c7] text-[#92400e] border border-[#fde68a] text-xs font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            Falta Informação
          </span>
        );
      case 'Desaprovada':
        return (
          <span className="px-2.5 py-1 rounded-full bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-1 border border-error/20">
            <span className="material-symbols-outlined text-[14px]">cancel</span>
            Desaprovada
          </span>
        );
      case 'Em revisão':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-semibold flex items-center gap-1 border border-outline-variant/30">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            Em revisão
          </span>
        );
    }
  };

  const getIdBadgeStyle = (status: StoryStatus) => {
    switch (status) {
      case 'Aprovada':
        return 'bg-tertiary-fixed text-on-tertiary-fixed-variant';
      case 'Falta Informação':
        return 'bg-[#fef3c7] text-[#92400e] border border-[#fde68a]';
      case 'Desaprovada':
        return 'bg-error-container text-on-error-container';
      case 'Em revisão':
      default:
        return 'bg-primary-fixed text-on-primary-fixed';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* KPI Summary Grid (3 Columns) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1 */}
        <div className="p-4 rounded-xl bg-white border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              User Stories Prontas
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-on-surface tracking-tight">{approvedCount}</span>
              <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant text-xs font-semibold">
                Aprovadas
              </span>
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

        {/* KPI 2 */}
        <div className="p-4 rounded-xl bg-white border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Em Revisão
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-on-surface tracking-tight">
                {reviewCount + missingInfoCount}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-semibold">
                Pendentes
              </span>
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

        {/* KPI 3 */}
        <div className="p-4 rounded-xl bg-white border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Análise Geral
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-on-surface tracking-tight">
                {averageQuality === null ? '—' : `${averageQuality}%`}
              </span>
            </div>
            <span className="text-xs text-secondary mt-1 flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              Qualidade do Backlog
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed shadow-xs">
            <span className="material-symbols-outlined text-[26px]">auto_awesome</span>
          </div>
        </div>
      </section>

      {/* Backlog Table Card */}
      <section className="flex flex-col gap-4 w-full">
        <div className="p-5 rounded-xl bg-white border border-outline-variant/30 shadow-xs flex flex-col gap-4">
          {/* Header & Filter pills */}
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

            {/* Filter pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveFilter('todos')}
                className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === 'todos'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span>Todos os Status</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                  activeFilter === 'todos' ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface-variant'
                }`}>
                  {totalCount}
                </span>
              </button>

              <button
                onClick={() => setActiveFilter('Em revisão')}
                className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === 'Em revisão'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                <span>Em revisão</span>
                <span className="px-1.5 py-0.2 rounded-full bg-surface-container-high text-[11px] font-semibold">
                  {reviewCount}
                </span>
              </button>

              <button
                onClick={() => setActiveFilter('Falta Informação')}
                className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === 'Falta Informação'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">warning</span>
                <span>Falta Informação</span>
                <span className="px-1.5 py-0.2 rounded-full bg-surface-container-high text-[11px] font-semibold">
                  {missingInfoCount}
                </span>
              </button>

              <button
                onClick={() => setActiveFilter('Aprovada')}
                className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === 'Aprovada'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                <span>Aprovada</span>
                <span className="px-1.5 py-0.2 rounded-full bg-surface-container-high text-[11px] font-semibold">
                  {approvedCount}
                </span>
              </button>

              <button
                onClick={() => setActiveFilter('Desaprovada')}
                className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === 'Desaprovada'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">cancel</span>
                <span>Desaprovada</span>
                <span className="px-1.5 py-0.2 rounded-full bg-surface-container-high text-[11px] font-semibold">
                  {rejectedCount}
                </span>
              </button>
            </div>
          </div>

          {/* Quick search input */}
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por palavras-chave ou código..."
              className="w-full pl-9 pr-4 py-2 bg-surface-container-low rounded-lg text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
            />
          </div>

          {/* Stories List */}
          <div className="flex flex-col gap-2.5">
            {filteredStories.map((story) => (
              <div
                key={story.id}
                className="p-4 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low transition-all shadow-xs border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div
                    className={`w-16 shrink-0 flex items-center justify-center py-1 rounded text-xs font-bold font-mono ${getIdBadgeStyle(
                      story.status
                    )}`}
                  >
                    {story.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                      {story.title}
                    </h4>
                    <p className="text-xs text-on-surface-variant truncate mt-0.5">
                      {story.summary}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  {getStatusBadge(story.status)}
                  <button
                    onClick={() => {
                      onSelectStory(story);
                      onNavigate('avaliacao-qualidade');
                    }}
                    className="h-8 px-4 rounded-lg bg-surface-container hover:bg-primary hover:text-white text-on-surface text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Ver análise</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            ))}

            {filteredStories.length === 0 && (
              <div className="p-8 text-center bg-surface-container-low rounded-xl text-xs text-on-surface-variant">
                Nenhuma User Story encontrada para este filtro.
              </div>
            )}
          </div>

          {/* Table Footer */}
          <div className="flex items-center justify-between pt-2 text-on-surface-variant text-xs border-t border-outline-variant/20">
            <span>
              Mostrando {filteredStories.length} de {totalCount} User Stories
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('follow-up')}
                className="text-primary hover:underline font-semibold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">help_outline</span>
                <span>Ver Perguntas de Follow-up ({stories.filter(s => s.hasAttentionGap).length} pendências)</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
