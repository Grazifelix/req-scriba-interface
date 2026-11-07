import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isJobActive, useJobs } from '../api/jobs.ts';
import { PROJECTS_QUERY_KEY } from '../api/projects.ts';
import { storiesKey } from '../api/stories.ts';
import { suggestionsKey } from '../api/suggestions.ts';
import { Job } from '../types.ts';

const STALE_AFTER_MS = 30 * 60 * 1000;

const finishedMessage = (job: Job): string => {
  if (job.status === 'erro') return `${job.typeLabel}: ${job.errorMessage ?? 'falhou.'}`;
  const noun = job.isAnalysis ? 'sugestão(ões)' : 'história(s)';
  const failures = job.failureCount > 0 ? ` ${job.failureCount} etapa(s) falharam.` : '';
  return `${job.typeLabel} concluída: ${job.resultMessage ?? `${job.createdCount} ${noun} criada(s).`}${failures}`;
};

export const JobStatusBanner: React.FC<{ projectId: string }> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const { data: jobs = [] } = useJobs(projectId);
  const followed = useRef(new Set<string>());
  const [finished, setFinished] = useState<Job | null>(null);
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
      }
    }
  }, [jobs, projectId, queryClient]);

  if (active) {
    const stale = Date.now() - new Date(active.createdAt).getTime() > STALE_AFTER_MS;
    return (
      <div role="status" aria-live="polite" className="w-full bg-primary-fixed/30 border-b border-primary/20 px-4 py-2 text-xs font-medium text-on-surface flex items-center justify-center gap-2 text-center">
        <span className="inline-block w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
        <span>
          {active.typeLabel}: {active.statusLabel.toLowerCase()}. A IA local pode levar alguns minutos; você pode continuar navegando.
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
      <button type="button" onClick={() => setFinished(null)} title="Fechar aviso" className="p-0.5 rounded hover:bg-black/5 cursor-pointer">
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
};
