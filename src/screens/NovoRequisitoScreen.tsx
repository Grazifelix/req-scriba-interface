import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../api/client.ts';
import { PROJECTS_QUERY_KEY } from '../api/projects.ts';
import { evaluateStory, storiesKey } from '../api/stories.ts';
import { approveSuggestion, rejectSuggestion, suggestionsKey, useSuggestion } from '../api/suggestions.ts';
import { StoryText } from '../components/StoryText.tsx';
import { SuggestionPanel } from '../components/SuggestionPanel.tsx';
import { Project, ScreenType } from '../types.ts';

interface NovoRequisitoScreenProps {
  project: Project;
  suggestionId: string;
  onOpenStory: (storyId: string) => void;
  onNavigate: (screen: ScreenType) => void;
  showToast: (msg: string, icon?: string) => void;
}

// Sugestão de novo requisito: ainda não há User Story, então aplicar cria a história.
export const NovoRequisitoScreen: React.FC<NovoRequisitoScreenProps> = ({
  project,
  suggestionId,
  onOpenStory,
  onNavigate,
  showToast,
}) => {
  const queryClient = useQueryClient();
  const { data: suggestion, isPending, error } = useSuggestion(suggestionId);
  const [isBusy, setIsBusy] = useState(false);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: suggestionsKey(project.id) }),
      queryClient.invalidateQueries({ queryKey: storiesKey(project.id) }),
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY }),
    ]);

  const handleApply = async () => {
    setIsBusy(true);
    try {
      const storyId = await approveSuggestion(suggestionId);
      await refresh();
      if (!storyId) {
        onNavigate('visao-geral');
        return;
      }
      showToast('User Story criada. Avaliando os 13 critérios...', 'sync');
      onOpenStory(storyId);
      evaluateStory(storyId)
        .then(() => showToast('Avaliação da nova User Story concluída.', 'verified'))
        .catch((e) => showToast(`A análise falhou: ${errorMessage(e)} Tente de novo em "Analisar a qualidade".`, 'error'))
        .finally(() => {
          refresh();
          queryClient.invalidateQueries({ queryKey: ['historia', storyId] });
        });
    } catch (e) {
      showToast(errorMessage(e), 'error');
      setIsBusy(false);
    }
  };

  const handleReject = async () => {
    setIsBusy(true);
    try {
      await rejectSuggestion(suggestionId);
      await refresh();
      showToast('Sugestão de novo requisito rejeitada.');
      onNavigate('visao-geral');
    } catch (e) {
      showToast(errorMessage(e), 'error');
      setIsBusy(false);
    }
  };

  if (isPending) return <p role="status" className="p-10 text-center text-xs text-on-surface-variant">Carregando sugestão...</p>;
  if (error || !suggestion) return <p role="alert" className="p-10 text-center text-xs text-error">{errorMessage(error)}</p>;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <button onClick={() => onNavigate('visao-geral')} className="self-start text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Backlog</span>
        </button>
        <span className="self-start inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-on-primary text-[11px] font-semibold">
          <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
          Sugestão da IA
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">{suggestion.proposedTitle}</h1>
      </div>

      <SuggestionPanel
        currentLabel="Versão Atual"
        currentText="Nenhuma: este possível novo requisito ainda não existe no backlog."
        suggestionText={suggestion.proposedText}
        notice={`${suggestion.typeLabel}: ${suggestion.justification}`}
        busy={isBusy}
        onApply={handleApply}
        onReject={handleReject}
      />

      {suggestion.proposedCriteria.length > 0 && (
        <section className="bg-white rounded-xl p-6 shadow-xs border border-surface-container flex flex-col gap-3">
          <h2 className="text-base font-bold text-on-surface">Critérios propostos</h2>
          <ul className="flex flex-col gap-2">
            {suggestion.proposedCriteria.map((criterion, i) => (
              <li key={i} className="bg-surface-container-low rounded-xl p-3 border border-surface-container text-xs text-on-surface leading-relaxed">
                <StoryText text={criterion} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
