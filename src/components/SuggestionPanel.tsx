import React from 'react';
import { StoryText } from './StoryText.tsx';

// Início de outra história: "H2:" ou, após ";", "." ou quebra de linha, um novo "Como <perfil>, quero" (igual à API).
const SPLIT_MARKER =
  /\bH\d+\s*:\s*|(?:(?<=[;.])\s+|\s*\n\s*)(?=como\s[^,;.]+,\s*(?:eu\s+)?(?:quero|gostaria|preciso|desejo)\b)/i;

interface SuggestionPanelProps {
  currentLabel?: string;
  currentText: string;
  suggestionText: string | null;
  notice?: string;
  changedFields?: string[];
  busy: boolean;
  position?: { index: number; total: number; onPrevious: () => void; onNext: () => void };
  applyLabel?: string;
  onApply: () => void;
  onReject: () => void;
}

export const SuggestionPanel: React.FC<SuggestionPanelProps> = ({
  currentLabel = 'Versão Atual (Original)',
  currentText,
  suggestionText,
  notice,
  changedFields = [],
  busy,
  position,
  applyLabel = 'Aplicar Sugestão',
  onApply,
  onReject,
}) => {
  const hasSuggestion = suggestionText !== null;
  // Reescrita da avaliação que divide a história: "H1: Como …; H2: Como …".
  const splitParts = (suggestionText ?? '')
    .split(SPLIT_MARKER)
    .map((part) => part.trim().replace(/;$/, '').trim())
    .filter(Boolean);

  return (
    <section className="bg-white rounded-xl p-6 shadow-xs border border-surface-container flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-surface-container">
        <div>
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">compare_arrows</span>
            <span>Sugestão de Melhoria de Texto</span>
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Compare a versão atual com a sugestão da IA. Nada muda sem a sua decisão.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {position && position.total > 1 && (
            <div className="flex items-center gap-1 text-xs text-on-surface-variant font-semibold">
              <button
                type="button"
                onClick={position.onPrevious}
                disabled={position.index === 0}
                title="Sugestão anterior"
                className="p-1 rounded hover:bg-surface-container disabled:opacity-40 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <span>
                {position.index + 1} de {position.total}
              </span>
              <button
                type="button"
                onClick={position.onNext}
                disabled={position.index === position.total - 1}
                title="Próxima sugestão"
                className="p-1 rounded hover:bg-surface-container disabled:opacity-40 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          )}
          <button
            onClick={onReject}
            disabled={!hasSuggestion || busy}
            type="button"
            className="px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-error text-xs font-semibold flex items-center gap-1.5 border border-surface-container transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
            <span>Rejeitar</span>
          </button>
          <button
            onClick={onApply}
            disabled={!hasSuggestion || busy}
            type="button"
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">check</span>
            <span>{applyLabel}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div data-testid="versao-atual" className="bg-surface-container-low rounded-xl p-4 border border-surface-container flex flex-col gap-2">
          <span className="text-[11px] text-outline font-semibold uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">history</span>
            {currentLabel}
          </span>
          <p className="text-xs text-on-surface italic leading-relaxed pt-1 bg-white p-3 rounded-lg border border-surface-container">
            <StoryText text={currentText} />
          </p>
          {hasSuggestion && notice && (
            <span className="text-xs text-secondary flex items-start gap-1 pt-1">
              <span className="material-symbols-outlined text-[15px]">error_outline</span>
              <span>{notice}</span>
            </span>
          )}
        </div>

        <div data-testid="sugestao-otimizada" className="bg-primary-fixed/20 rounded-xl p-4 border border-primary/30 flex flex-col gap-2">
          <span className="text-[11px] text-primary font-semibold uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
            Sugestão Otimizada (Recomendada)
          </span>
          <div className="text-xs text-on-surface leading-relaxed pt-1 bg-white p-3 rounded-lg border border-primary/20">
            {hasSuggestion ? (
              splitParts.length > 1 ? (
                <ol className="flex flex-col gap-1.5 list-decimal pl-4">
                  {splitParts.map((part, i) => <li key={i}><StoryText text={part} /></li>)}
                </ol>
              ) : (
                <StoryText text={suggestionText} />
              )
            ) : (
              'Nenhuma sugestão pendente para esta User Story.'
            )}
          </div>
          {splitParts.length > 1 && (
            <span className="text-xs text-tertiary flex items-start gap-1 pt-1 font-medium">
              <span className="material-symbols-outlined text-[15px]">call_split</span>
              <span>Ao aplicar, a 1ª substitui esta User Story e as outras {splitParts.length - 1} viram novas User Stories, cada uma com critérios de aceite próprios.</span>
            </span>
          )}
          {hasSuggestion && changedFields.length > 0 && (
            <span className="text-xs text-tertiary flex items-start gap-1 pt-1 font-medium">
              <span className="material-symbols-outlined text-[15px]">edit_note</span>
              <span>Ao aplicar, muda: {changedFields.join(', ')}.</span>
            </span>
          )}
        </div>
      </div>
    </section>
  );
};
