import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../api/client.ts';
import { startQualityEvaluation } from '../api/jobs.ts';

interface Props {
  projectId: string;
  storyIds: number[];
  onClose: () => void;
}

// Oferecido ao fim de uma geração: avalia de uma vez a qualidade QUS das histórias recém-criadas.
export const QualityEvaluationPrompt: React.FC<Props> = ({ projectId, storyIds, onClose }) => {
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const count = storyIds.length;
  const target = count === 1 ? 'a User Story gerada' : `todas as ${count} User Stories`;

  const handleConfirm = async () => {
    setIsSending(true);
    setError(null);
    try {
      await startQualityEvaluation(queryClient, projectId, storyIds);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#213145]/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quality-prompt-title"
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 border border-outline-variant/30"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">task_alt</span>
          </div>
          <h2 id="quality-prompt-title" className="text-base font-bold text-on-surface">Geração concluída!</h2>
        </div>

        <p className="text-xs text-on-surface leading-relaxed">
          Deseja analisar a qualidade de {target}? A avaliação usa os 13 critérios QUS e roda em segundo plano; você
          pode continuar navegando.
        </p>

        {error && (
          <p role="alert" className="text-xs text-on-error-container bg-error-container rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50 cursor-pointer"
          >
            Não, farei a análise manual
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSending}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">fact_check</span>
            <span>{isSending ? 'Iniciando…' : 'Sim'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
