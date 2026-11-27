import React from 'react';
import { useVersionComparison } from '../api/stories.ts';
import { errorMessage } from '../api/client.ts';

// Diferenças de uma versão para a anterior (carregadas só quando o analista abre a comparação).
export const VersionComparisonPanel: React.FC<{ storyId: string; from: number; to: number }> = ({ storyId, from, to }) => {
  const { data, isPending, error } = useVersionComparison(storyId, from, to, true);
  if (isPending) return <p role="status" className="text-[11px] text-on-surface-variant">Comparando v{from} com v{to}...</p>;
  if (error || !data) return <p role="alert" className="text-[11px] text-error">{errorMessage(error)}</p>;
  return (
    <div data-testid="version-comparison" className="bg-white rounded-lg border border-surface-container p-3 flex flex-col gap-1 text-[11px] text-on-surface-variant">
      <span className="font-semibold text-on-surface">Mudanças de v{from} para v{to}</span>
      <span>Campos: {data.changedFields.length ? data.changedFields.join(', ') : 'nenhum'}</span>
      {data.criteriaTracked ? (
        <>
          {data.addedCriteria.map((c, i) => <span key={`a${i}`} className="text-tertiary">+ Critério: {c}</span>)}
          {data.removedCriteria.map((c, i) => <span key={`r${i}`} className="text-error">− Critério: {c}</span>)}
          {!data.addedCriteria.length && !data.removedCriteria.length && <span>Critérios: sem mudança</span>}
        </>
      ) : (
        <span>Critérios: versões antigas não registram quais critérios valiam (veja o texto de cada versão).</span>
      )}
      {data.addedEvidence.map((e, i) => <span key={`e${i}`} className="line-clamp-2" title={e}>+ Evidência: {e}</span>)}
    </div>
  );
};
