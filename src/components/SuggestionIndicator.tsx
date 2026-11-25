import React from 'react';

interface SuggestionIndicatorProps {
  count: number;
  /** A US está sendo avaliada: as estrelas viram um ícone de carregamento. */
  loading?: boolean;
}

// Ícone ao lado do status: a User Story tem recomendações da IA aguardando avaliação do usuário.
export const SuggestionIndicator: React.FC<SuggestionIndicatorProps> = ({ count, loading = false }) => {
  if (!loading && count <= 0) return null;
  const label = loading
    ? 'User Story em análise'
    : count === 1
      ? '1 recomendação aguardando avaliação'
      : `${count} recomendações aguardando avaliação`;
  return (
    <span
      data-testid="suggestion-indicator"
      role={loading ? 'status' : 'img'}
      aria-label={label}
      title={label}
      className="w-7 h-7 shrink-0 rounded-full bg-transparent text-primary flex items-center justify-center"
    >
      {loading ? (
        <span className="inline-block w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
      ) : (
        <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
      )}
    </span>
  );
};
