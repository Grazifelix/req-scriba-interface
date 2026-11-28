import React, { useState } from 'react';
import { AuditItem, AuditResult, CriterionSource, TestCriterion } from '../types.ts';
import { AuditBadge } from './EvidenceAuditPanel.tsx';

// Rótulos iguais aos de CriterionSource.parts e AuditItem.unsupportedParts (ver api/stories.ts).
const STEPS = [
  { label: 'Dado', key: 'given' },
  { label: 'Quando', key: 'when' },
  { label: 'Então', key: 'then' },
] as const;

const RESULT_BORDER: Record<AuditResult, string> = {
  COMPATIVEL: 'border-l-tertiary',
  PARCIALMENTE_COMPATIVEL: 'border-l-[#d97706]',
  INCOMPATIVEL: 'border-l-error',
  INSUFICIENTE: 'border-l-outline-variant',
  SEM_EVIDENCIA: 'border-l-outline-variant',
};

const iconButton =
  'p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50 cursor-pointer';

// Trecho de fonte com rótulo curto (F1, F2...) para ser citado ao lado de cada passo.
interface LabeledSource extends CriterionSource {
  label: string;
}

const SourceChip: React.FC<{ source: LabeledSource; onClick: () => void }> = ({ source, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title={`${source.fileName}${source.location ? ` · ${source.location}` : ''}`}
    aria-label={`Ver trecho ${source.label}`}
    className="px-1.5 py-0.5 rounded bg-white border border-surface-container text-[10px] font-mono font-semibold text-primary hover:bg-surface-container transition-colors cursor-pointer"
  >
    {source.label}
  </button>
);

const StepRow: React.FC<{
  label: string;
  text: string;
  sources: LabeledSource[];
  unsupported: boolean;
  onOpenSources: () => void;
}> = ({ label, text, sources, unsupported, onOpenSources }) => {
  const backing = sources.filter((s) => s.parts.includes(label));
  return (
    <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-2 py-1">
      <span className="text-xs font-semibold text-primary">{label}</span>
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
          <span className="text-xs text-on-surface leading-relaxed">{text}</span>
          {backing.map((s) => <SourceChip key={s.chunkId} source={s} onClick={onOpenSources} />)}
        </div>
        {unsupported && (
          <p className="text-[11px] text-[#92400e] bg-[#fffbeb] border border-[#fde68a] rounded-lg px-2 py-1 flex items-start gap-1">
            <span className="material-symbols-outlined text-[13px] mt-px">warning</span>
            <span><span className="font-semibold">Sem sustentação nas fontes.</span> Os trechos vinculados não confirmam este passo.</span>
          </p>
        )}
      </div>
    </div>
  );
};

const SourceItem: React.FC<{ source: LabeledSource }> = ({ source }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <li className="flex flex-col gap-1 p-2.5 rounded-lg bg-white border border-surface-container">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="font-mono font-semibold text-primary">{source.label}</span>
        <span className="material-symbols-outlined text-[14px] text-secondary">description</span>
        <span className="font-semibold text-on-surface truncate max-w-[24rem]">{source.fileName}</span>
        {source.location && (
          <span className="px-1.5 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed-variant text-[10px] font-semibold">{source.location}</span>
        )}
        {source.parts.length > 0 && <span className="text-on-surface-variant">sustenta: {source.parts.join(', ')}</span>}
      </div>
      {source.quote && (
        <>
          <blockquote className={`text-[11px] italic text-on-surface-variant leading-relaxed border-l-2 border-outline-variant pl-2.5 ${expanded ? '' : 'line-clamp-2'}`}>
            "{source.quote}"
          </blockquote>
          <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="self-start text-[11px] text-primary font-semibold hover:underline cursor-pointer">
            {expanded ? 'Mostrar menos' : 'Ver trecho completo'}
          </button>
        </>
      )}
    </li>
  );
};

const OutdatedNotice: React.FC<{
  criterion: TestCriterion;
  busy: boolean;
  onConfirm: () => void;
  onRegenerate: () => void;
}> = ({ criterion, busy, onConfirm, onRegenerate }) => (
  <div role="note" className="rounded-lg bg-[#fffbeb] border border-[#fde68a] px-3 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
    <p className="text-[11px] text-[#92400e] flex items-start gap-1">
      <span className="material-symbols-outlined text-[14px] mt-px">update</span>
      <span>
        {criterion.outdatedReason ?? 'A User Story mudou depois deste critério.'}
        {criterion.validatedVersion != null && ` Validado na v${criterion.validatedVersion}: confira se ainda vale.`}
      </span>
    </p>
    {criterion.criterionId != null && (
      <div className="flex items-center gap-2 shrink-0">
        <button type="button" onClick={onConfirm} disabled={busy} className="px-2.5 py-1 rounded-lg bg-white border border-[#fde68a] text-[11px] font-semibold text-tertiary hover:bg-[#fef3c7] transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer">
          <span className="material-symbols-outlined text-[14px]">check</span>
          Continua válido
        </button>
        <button type="button" onClick={onRegenerate} disabled={busy} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-secondary hover:bg-[#fef3c7] transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer">
          <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
          Regerar este critério
        </button>
      </div>
    )}
  </div>
);

const CriterionItem: React.FC<{
  criterion: TestCriterion;
  index: number;
  busy: boolean;
  audit?: AuditItem;
  onDelete: () => void;
  onConfirm: () => void;
  onRegenerate: () => void;
}> = ({ criterion, index, busy, audit, onDelete, onConfirm, onRegenerate }) => {
  const [showSources, setShowSources] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const structured = Boolean(criterion.when || criterion.then);
  const sources: LabeledSource[] = criterion.sources.map((s, i) => ({ ...s, label: `F${i + 1}` }));
  const unsupported = new Set(audit?.unsupportedParts ?? []);
  const border = criterion.outdated ? 'border-l-[#d97706]' : audit ? RESULT_BORDER[audit.result] : 'border-l-outline-variant';
  const sourcesId = `criterion-${criterion.id}-sources`;
  const auditNotes = audit && audit.result !== 'COMPATIVEL' ? audit : null;
  const problems = auditNotes?.problems ?? [];
  const correction = auditNotes?.correction;
  const hasNotes = problems.length > 0 || Boolean(correction) || criterion.warnings.length > 0;

  return (
    <li data-testid="criterion" className={`bg-[#f8f9fa] rounded-xl p-4 border border-[#d1d5db] border-l-4 flex flex-col gap-2 ${border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">{index + 1}</span>
          <span className="text-xs font-bold text-on-surface">{criterion.title}</span>
          {criterion.aiGenerated && (
            <span className="text-primary text-[10px] font-semibold inline-flex items-center gap-0.5" title="Gerado pela IA a partir das evidências da User Story">
              <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
              Sugestão da IA
            </span>
          )}
          {audit ? (
            <span className={criterion.outdated ? 'opacity-60' : ''} title={criterion.outdated ? 'Resultado da auditoria anterior à mudança da User Story' : undefined}>
              <AuditBadge item={audit} variant="outline" />
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[10px] font-semibold">Não auditado</span>
          )}
          {criterion.outdated && (
            <span data-testid="criterion-outdated" className="px-1.5 py-0.5 rounded bg-[#fef3c7] text-[#92400e] text-[10px] font-semibold inline-flex items-center gap-0.5" title={criterion.outdatedReason ?? ''}>
              <span className="material-symbols-outlined text-[12px]">update</span>
              Desatualizado
            </span>
          )}
          {criterion.storyVersion && <span className="text-[10px] text-outline">desde a v{criterion.storyVersion}</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {confirmDelete ? (
            <>
              <span className="text-[11px] text-on-surface-variant">Excluir regra?</span>
              <button type="button" onClick={onDelete} disabled={busy} className="px-2 py-1 rounded-lg bg-error text-white text-[11px] font-semibold disabled:opacity-50 cursor-pointer">Excluir</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="px-2 py-1 rounded-lg text-[11px] font-semibold text-on-surface-variant hover:bg-surface-container cursor-pointer">Cancelar</button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} disabled={busy} title="Excluir regra" aria-label={`Excluir regra ${index + 1}`} className={`${iconButton} hover:text-error`}>
              <span className="material-symbols-outlined text-[18px]">delete_outline</span>
            </button>
          )}
        </div>
      </div>

      {criterion.outdated && <OutdatedNotice criterion={criterion} busy={busy} onConfirm={onConfirm} onRegenerate={onRegenerate} />}

      {structured ? (
        <div className="flex flex-col">
          {STEPS.map(({ label, key }) =>
            criterion[key] ? (
              <StepRow
                key={key}
                label={label}
                text={criterion[key] as string}
                sources={sources}
                unsupported={unsupported.has(label)}
                onOpenSources={() => setShowSources(true)}
              />
            ) : null
          )}
        </div>
      ) : (
        <p className="text-xs text-on-surface leading-relaxed whitespace-pre-line">{criterion.criterion}</p>
      )}

      {(sources.length > 0 || hasNotes) && (
        <div className="flex flex-col gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => setShowSources((v) => !v)}
            aria-expanded={showSources}
            aria-controls={sourcesId}
            className="self-start text-[11px] text-primary font-semibold flex items-center gap-0.5 hover:text-[#002d80] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">{showSources ? 'expand_less' : 'expand_more'}</span>
            {showSources ? 'Ocultar' : 'Ver'} {sources.length > 0 ? `${sources.length} trecho(s) das fontes e auditoria` : 'auditoria'}
          </button>
          {showSources && (
            <div id={sourcesId} className="flex flex-col gap-2">
              {hasNotes && (
                <div data-testid="criterion-audit-notes" className="p-3 bg-[#fffbeb] border border-[#fcd34d] rounded-lg flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#d97706]">info</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-[#78350f]">O que a auditoria apontou nas fontes</span>
                    <ul data-testid="criterion-warnings" className="text-xs text-[#92400e] leading-relaxed list-disc pl-4">
                      {problems.map((problem, i) => <li key={`p${i}`}>{problem}</li>)}
                      {criterion.warnings.map((warning, i) => <li key={`w${i}`}>{warning}</li>)}
                      {correction && <li className="italic">Correção sugerida (não aplicada): {correction}</li>}
                    </ul>
                  </div>
                </div>
              )}
              {sources.length > 0 && (
                <ul data-testid="criterion-sources" className="flex flex-col gap-1.5">
                  {sources.map((s) => <SourceItem key={s.chunkId} source={s} />)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
};

interface AcceptanceCriteriaCardProps {
  criteria: TestCriterion[];
  /** O que falta nas fontes para gerar critérios (devolvido pela geração). */
  gaps: string[];
  /** Resultado da auditoria semântica por id permanente do critério. */
  audits?: Record<number, AuditItem>;
  busy: boolean;
  generating: boolean;
  /** História aprovada: os critérios gerados viram proposta em vez de substituir os atuais. */
  approved: boolean;
  onGenerate: (criterionIds?: number[]) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onConfirm: (criterionId: number) => void;
}

// Critérios de aceitação (Dado/Quando/Então) com os trechos que sustentam cada passo e o resultado da auditoria.
export const AcceptanceCriteriaCard: React.FC<AcceptanceCriteriaCardProps> = ({
  criteria,
  gaps,
  audits,
  busy,
  generating,
  approved,
  onGenerate,
  onAdd,
  onDelete,
  onConfirm,
}) => {
  const auditOf = (c: TestCriterion) => (c.criterionId != null ? audits?.[c.criterionId] : undefined);
  const outdatedCount = criteria.filter((c) => c.outdated).length;

  return (
    <section aria-labelledby="criteria-title" aria-busy={generating} className="bg-white rounded-xl p-6 shadow-xs border border-surface-container flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-surface-container">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">checklist</span>
          </div>
          <div>
            <h2 id="criteria-title" className="text-base font-bold text-on-surface">Critérios de Aceitação</h2>
            <p className="text-xs text-on-surface-variant">
              {criteria.length > 0 ? `${criteria.length} regra(s) no formato Dado / Quando / Então` : 'Critérios objetivos para verificar a entrega'}
              {outdatedCount > 0 && <> · <span className="text-[#92400e] font-semibold">{outdatedCount} desatualizado(s)</span></>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onGenerate()}
            disabled={busy}
            type="button"
            title={approved ? 'User Story aprovada: os critérios gerados viram uma proposta para revisão' : 'Gera critérios a partir das evidências desta User Story'}
            className="px-3.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary text-xs font-semibold flex items-center gap-1 border border-surface-container transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[18px] ${generating ? 'animate-spin' : ''}`}>{generating ? 'progress_activity' : 'auto_awesome'}</span>
            <span>
              {generating
                ? 'Gerando...'
                : outdatedCount > 0
                  ? `Regerar desatualizados (${outdatedCount})`
                  : criteria.length > 0 ? 'Regerar critérios' : 'Gerar critérios'}
            </span>
          </button>
          <button onClick={onAdd} disabled={busy} type="button" className="px-3.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary text-xs font-semibold flex items-center gap-1 border border-surface-container transition-colors shadow-xs disabled:opacity-50 cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Adicionar Regra</span>
          </button>
        </div>
      </div>

      <div role="status" aria-live="polite" className="sr-only">{generating ? 'Gerando critérios.' : ''}</div>

      {gaps.length > 0 && (
        <div data-testid="criteria-gaps" className="p-3 bg-[#fffbeb] border border-[#fcd34d] rounded-lg flex items-start gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#d97706]">info</span>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-[#78350f]">O que falta nas fontes para os critérios</span>
            <ul className="text-xs text-[#92400e] leading-relaxed list-disc pl-4">
              {gaps.map((gap, i) => <li key={i}>{gap}</li>)}
            </ul>
          </div>
        </div>
      )}

      {criteria.length === 0 ? (
        <div className="text-center py-4 flex flex-col items-center gap-1">
          <p className="text-xs font-semibold text-on-surface">Nenhum critério definido</p>
          <p className="text-xs text-on-surface-variant">Adicione uma regra ou gere critérios a partir das evidências da User Story.</p>
        </div>
      ) : (
        <ol className={`flex flex-col gap-3 ${generating ? 'opacity-60' : ''}`}>
          {criteria.map((criterion, idx) => (
            <CriterionItem
              key={criterion.id}
              criterion={criterion}
              index={idx}
              busy={busy}
              audit={auditOf(criterion)}
              onDelete={() => onDelete(criterion.id)}
              onConfirm={() => criterion.criterionId != null && onConfirm(criterion.criterionId)}
              onRegenerate={() => criterion.criterionId != null && onGenerate([criterion.criterionId])}
            />
          ))}
        </ol>
      )}
    </section>
  );
};
