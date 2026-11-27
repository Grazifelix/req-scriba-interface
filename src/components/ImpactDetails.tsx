import React from 'react';
import { Suggestion } from '../types.ts';

const ORIGIN_LABELS: Record<string, string> = {
  fonte_nova: 'Fonte nova',
  evidencia_atual: 'Evidência atual',
};

// Detalhes de uma proposta da análise de novas fontes: o que muda, o que precisa ser revisto e por quê.
export const ImpactDetails: React.FC<{ suggestion: Suggestion }> = ({ suggestion }) => {
  const {
    outdated, baseVersion, currentVersion, reclassifiedFrom, affectedComponents, affectedCriteria,
    conflicts, alternativeText, possibleDuplicates, temporaryId, isConfirmation,
  } = suggestion;
  const hasContent = outdated || reclassifiedFrom || affectedComponents.length || affectedCriteria.length
    || conflicts.length || alternativeText || possibleDuplicates.length || temporaryId || isConfirmation;
  if (!hasContent) return null;

  return (
    <section data-testid="impact-details" className="bg-white rounded-xl p-6 shadow-xs border border-surface-container flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-surface-container">
        <span className="material-symbols-outlined text-[20px] text-primary">difference</span>
        <h2 className="text-base font-bold text-on-surface">Impacto da nova fonte</h2>
        <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary text-[11px] font-semibold">{suggestion.typeLabel}</span>
        {temporaryId && <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface text-[11px] font-mono font-semibold" title="Id temporário: o código definitivo (US-…) é atribuído ao aprovar">{temporaryId}</span>}
      </div>

      {outdated && (
        <p data-testid="proposal-outdated" className="text-xs text-[#92400e] bg-[#fffbeb] border border-[#fcd34d] rounded-lg p-2.5 flex items-start gap-1.5">
          <span className="material-symbols-outlined text-[16px]">update</span>
          <span>
            A User Story mudou depois desta proposta (proposta feita sobre a v{baseVersion ?? '?'}; atual: v{currentVersion ?? '?'}).
            Ao aplicar, você vai confirmar se quer aplicar só os campos que a proposta altera, preservando o que mudou depois.
          </span>
        </p>
      )}
      {isConfirmation && (
        <p className="text-xs text-on-surface-variant">A nova fonte reafirma esta User Story. Aplicar não muda o texto: só vincula os trechos novos como evidência.</p>
      )}
      {reclassifiedFrom && (
        <p className="text-xs text-on-surface-variant">A IA classificou como {reclassifiedFrom}; o sistema reclassificou porque a proposta {suggestion.affectedComponents.length ? 'muda' : 'não muda'} perfil, funcionalidade ou benefício.</p>
      )}
      {affectedComponents.length > 0 && (
        <p className="text-xs text-on-surface"><span className="font-semibold">Componentes alterados:</span> {affectedComponents.join(', ')}</p>
      )}

      {affectedCriteria.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-on-surface">Critérios de aceitação afetados</span>
          <ul className="flex flex-col gap-1">
            {affectedCriteria.map((c) => (
              <li key={c.code} className="text-[11px] text-on-surface-variant flex items-start gap-1.5">
                <span className={`px-1.5 py-0.5 rounded font-semibold shrink-0 ${c.action === 'REVISAR' ? 'bg-[#fef3c7] text-[#92400e]' : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'}`}
                      title={c.byModel ? 'Indicado pela IA' : 'Marcado pelo sistema: numa modificação, critério antigo não vale automaticamente'}>
                  {c.action === 'REVISAR' ? 'Revisar' : 'Manter'}
                </span>
                <span><span className="font-mono font-semibold">{c.code}</span> {c.criterion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {conflicts.map((conflict, i) => (
        <div key={i} data-testid="impact-conflict" className="flex flex-col gap-1.5 bg-error-container/30 border border-error/20 rounded-lg p-3">
          <span className="text-xs font-semibold text-on-surface flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-error">sync_problem</span>
            Conflito: {conflict.description}
          </span>
          {conflict.impact && <span className="text-[11px] text-on-surface-variant">Impacto: {conflict.impact}</span>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {conflict.sources.map((source) => (
              <div key={source.label} className="bg-white rounded-lg border border-surface-container p-2 text-[11px] flex flex-col gap-0.5">
                <span className="font-semibold text-on-surface">{ORIGIN_LABELS[source.origin] ?? source.origin} · {source.description}</span>
                <span className="italic text-on-surface-variant line-clamp-3" title={source.text}>"{source.text}"</span>
              </div>
            ))}
          </div>
          <span className="text-[11px] text-on-surface-variant">O sistema não decide qual informação prevalece: edite a proposta, aplique ou rejeite.</span>
        </div>
      ))}

      {alternativeText && (
        <p className="text-xs text-on-surface-variant"><span className="font-semibold">Alternativa sugerida pela IA (não aplicada):</span> {alternativeText}</p>
      )}

      {possibleDuplicates.length > 0 && (
        <p data-testid="possible-duplicates" className="text-xs text-[#92400e]">
          Possível duplicidade com: {possibleDuplicates.map((d) => `${d.code} (${Math.round(d.similarity * 100)}%)`).join(', ')}. Confira antes de aprovar.
        </p>
      )}
    </section>
  );
};
