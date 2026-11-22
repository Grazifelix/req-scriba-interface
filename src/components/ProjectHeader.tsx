import React, { useState } from 'react';
import { useLatestAnalysis } from '../api/analyses.ts';
import { useJobs } from '../api/jobs.ts';
import { useStories } from '../api/stories.ts';
import { Project, ScreenType } from '../types.ts';
import { AnalysisReviewModal } from './AnalysisReviewModal.tsx';

interface ProjectHeaderProps {
  project: Project;
  onNavigate: (screen: ScreenType) => void;
  onNavigateHome?: () => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({ project, onNavigate, onNavigateHome }) => {
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const { data: analysis } = useLatestAnalysis(project.id);
  const { data: jobs = [] } = useJobs(project.id);
  const { data: stories = [] } = useStories(project.id);

  // Análise da IA ainda não aprovada: o modal também oferece "Criar tarefas do Sistema".
  const pendingJob =
    analysis && !analysis.reviewed && analysis.jobId
      ? jobs.find((j) => j.id === analysis.jobId && j.status === 'concluido')
      : undefined;

  return (
    <section className="w-full bg-white border-b border-outline-variant/25 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Project Icon, Title and Description */}
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-xs border border-primary/20 mt-0.5">
              <span className="material-symbols-outlined text-[26px]">folder_open</span>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                {onNavigateHome && (
                  <button
                    onClick={onNavigateHome}
                    className="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 font-medium cursor-pointer"
                    title="Voltar para Meus Projetos"
                  >
                    <span>Meus Projetos</span>
                    <span className="text-outline-variant">/</span>
                  </button>
                )}
                <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight truncate">
                  {project.name}
                </h1>
              </div>

              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mt-1 line-clamp-2 max-w-4xl">
                {project.systemDescription || 'Descrição do sistema disponível após a análise das fontes.'}
              </p>

              <div className="flex items-center gap-3 text-xs text-on-surface-variant pt-2 flex-wrap">
                <span className="flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-[15px] text-secondary">description</span>
                  {project.filesSummary}
                </span>
                <span>•</span>
                <span className="font-mono text-[11px] text-outline">
                  ID: {project.id}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Visualizar Análise */}
          <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
            <button
              type="button"
              onClick={() => setIsAnalysisOpen(true)}
              disabled={!analysis}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface hover:bg-surface-container border border-outline-variant/30 text-on-surface text-xs font-semibold transition-all shadow-2xs hover:shadow-xs disabled:opacity-50 cursor-pointer"
              title={
                analysis
                  ? 'Ver e corrigir o entendimento do projeto gerado a partir das fontes'
                  : 'Nenhuma análise ainda. Use "Analisar fontes" na aba de fontes.'
              }
            >
              <span className="material-symbols-outlined text-[16px] text-primary">psychology</span>
              <span>Visualizar Análise</span>
              {pendingJob && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-bold">
                  a revisar
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {isAnalysisOpen && analysis && (
        pendingJob ? (
          <AnalysisReviewModal
            projectId={project.id}
            analysisId={analysis.id}
            audioIds={pendingJob.audioIds.map(String)}
            documentIds={pendingJob.documentIds.map(String)}
            hasStories={stories.length > 0}
            onClose={() => setIsAnalysisOpen(false)}
            onStarted={() => {
              setIsAnalysisOpen(false);
              onNavigate('visao-geral');
            }}
          />
        ) : (
          <AnalysisReviewModal projectId={project.id} analysisId={analysis.id} onClose={() => setIsAnalysisOpen(false)} />
        )
      )}
    </section>
  );
};
