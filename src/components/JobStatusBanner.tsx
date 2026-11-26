import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { latestAnalysisKey } from '../api/analyses.ts';
import { GENERATION_STAGES, isJobActive, useJobs } from '../api/jobs.ts';
import { PROJECTS_QUERY_KEY } from '../api/projects.ts';
import { storiesKey, useStories } from '../api/stories.ts';
import { suggestionsKey } from '../api/suggestions.ts';
import { Job, ScreenType } from '../types.ts';
import { AnalysisReviewModal } from './AnalysisReviewModal.tsx';
import { QualityEvaluationPrompt } from './QualityEvaluationPrompt.tsx';

const STALE_AFTER_MS = 30 * 60 * 1000;

const finishedMessage = (job: Job): string => {
  if (job.status === 'erro') return `${job.typeLabel}: ${job.errorMessage ?? 'falhou.'}`;
  if (job.type === 'analise_fontes') {
    return job.analysisId
      ? `${job.typeLabel} concluída. Revise o resultado para criar as tarefas do sistema.`
      : `${job.typeLabel} concluída: ${job.resultMessage ?? 'nenhuma informação identificada.'}`;
  }
  if (job.type === 'avaliacao_qualidade') {
    const failures = job.failureCount > 0 ? ` ${job.failureCount} história(s) não puderam ser avaliadas.` : '';
    return `${job.typeLabel} concluída: ${job.createdCount} história(s) avaliada(s).${failures}`;
  }
  if (job.type === 'geracao_criterios') {
    const failures = job.failureCount > 0 ? ` ${job.failureCount} história(s) falharam; gere os critérios delas de novo.` : '';
    return `${job.typeLabel} concluída: ${job.resultMessage ?? `${job.createdCount} história(s) atualizada(s).`}${failures}`;
  }
  const noun = job.isAnalysis ? 'sugestão(ões)' : 'história(s)';
  const failures = job.failureCount > 0 ? ` ${job.failureCount} etapa(s) falharam.` : '';
  const criteria = job.criteriaFailureCount > 0 ? ' Os critérios de aceitação não foram gerados para parte das histórias; gere-os na revisão.' : '';
  return `${job.typeLabel} concluída: ${job.resultMessage ?? `${job.createdCount} ${noun} criada(s).`}${failures}${criteria}`;
};

export const JobStatusBanner: React.FC<{ projectId: string; onNavigate: (screen: ScreenType) => void }> = ({
  projectId,
  onNavigate,
}) => {
  const queryClient = useQueryClient();
  const { data: jobs = [] } = useJobs(projectId);
  const { data: stories = [] } = useStories(projectId);
  const followed = useRef(new Set<string>());
  const [finished, setFinished] = useState<Job | null>(null);
  const [storiesToEvaluate, setStoriesToEvaluate] = useState<number[]>([]);
  const [analysisToReview, setAnalysisToReview] = useState<Job | null>(null);
  const active = jobs.find(isJobActive);

  // Só anuncia o fim dos jobs vistos em andamento, para não reexibir resultados antigos.
  useEffect(() => {
    for (const job of jobs) {
      if (isJobActive(job)) {
        followed.current.add(job.id);
      } else if (followed.current.delete(job.id)) {
        setFinished(job);
        queryClient.invalidateQueries({ queryKey: storiesKey(projectId) });
        queryClient.invalidateQueries({ queryKey: suggestionsKey(projectId) });
        queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
        if (job.type === 'avaliacao_qualidade' || job.type === 'geracao_criterios') {
          queryClient.invalidateQueries({ queryKey: ['historia'] });
        }
        if (job.type === 'analise_fontes') {
          queryClient.invalidateQueries({ queryKey: latestAnalysisKey(projectId) });
          if (job.status === 'concluido' && job.analysisId) setAnalysisToReview(job);
        }
        if (job.type === 'geracao_historias' && job.status === 'concluido' && job.createdStoryIds.length > 0) {
          setStoriesToEvaluate(job.createdStoryIds);
        }
      }
    }
  }, [jobs, projectId, queryClient]);

  const prompt = storiesToEvaluate.length > 0 && (
    <QualityEvaluationPrompt projectId={projectId} storyIds={storiesToEvaluate} onClose={() => setStoriesToEvaluate([])} />
  );

  const review = analysisToReview?.analysisId && (
    <AnalysisReviewModal
      projectId={projectId}
      analysisId={analysisToReview.analysisId}
      audioIds={analysisToReview.audioIds.map(String)}
      documentIds={analysisToReview.documentIds.map(String)}
      hasStories={stories.length > 0}
      onClose={() => setAnalysisToReview(null)}
      onStarted={() => {
        setAnalysisToReview(null);
        setFinished(null);
        onNavigate('visao-geral');
      }}
    />
  );

  return (
    <>
      <StatusLine active={active} finished={finished} onDismiss={() => setFinished(null)} />
      {prompt}
      {review}
    </>
  );
};

// "Etapa 5 de 7: Geração dos critérios de aceitação" enquanto o job de geração roda.
const currentStage = (job: Job): string | null => {
  const stage = [...job.stages].reverse().find((s) => s.status === 'em_andamento');
  if (!stage || job.type !== 'geracao_historias') return null;
  const total = Object.keys(GENERATION_STAGES).length;
  return `Etapa ${job.stages.length} de ${total}: ${stage.label}.`;
};

const StatusLine: React.FC<{ active?: Job; finished: Job | null; onDismiss: () => void }> = ({ active, finished, onDismiss }) => {
  if (active) {
    const stage = currentStage(active);
    const stale = Date.now() - new Date(active.createdAt).getTime() > STALE_AFTER_MS;
    return (
      <div role="status" aria-live="polite" className="w-full bg-primary-fixed/30 border-b border-primary/20 px-4 py-2 text-xs font-medium text-on-surface flex items-center justify-center gap-2 text-center">
        <span className="inline-block w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
        <span>
          {active.typeLabel}: {active.statusLabel.toLowerCase()}.{stage && ` ${stage}`} A IA local pode levar alguns minutos; você pode continuar navegando.
          {stale && ' Este processo está demorando muito e pode ter sido interrompido se a API foi reiniciada.'}
        </span>
      </div>
    );
  }

  if (!finished) return null;

  return (
    <div
      role={finished.status === 'erro' ? 'alert' : 'status'}
      className={`w-full border-b px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 text-center ${
        finished.status === 'erro' ? 'bg-error-container text-on-error-container border-error/30' : 'bg-tertiary-fixed/40 text-on-surface border-tertiary/20'
      }`}
    >
      <span>{finishedMessage(finished)}</span>
      <button type="button" onClick={onDismiss} title="Fechar aviso" className="p-0.5 rounded hover:bg-black/5 cursor-pointer">
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
};
