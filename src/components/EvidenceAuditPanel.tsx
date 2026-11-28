import React, { useState } from 'react';
import { AuditItem, AuditResult, EvidenceAudit, StoryComponent, StructuralIssue } from '../types.ts';

const RESULT_STYLE: Record<AuditResult, { label: string; className: string; icon: string }> = {
  COMPATIVEL: { label: 'Compatível', className: 'bg-tertiary-fixed text-on-tertiary-fixed-variant', icon: 'check' },
  PARCIALMENTE_COMPATIVEL: { label: 'Parcial', className: 'bg-[#fef3c7] text-[#92400e]', icon: 'contrast' },
  INCOMPATIVEL: { label: 'Incompatível', className: 'bg-error-container text-on-error-container', icon: 'close' },
  INSUFICIENTE: { label: 'Insuficiente', className: 'bg-surface-container-high text-on-surface-variant', icon: 'help' },
  SEM_EVIDENCIA: { label: 'Sem evidência', className: 'bg-surface-container-high text-on-surface-variant', icon: 'link_off' },
};

// Linha de cada afirmação: borda lateral e fundo conforme o resultado.
const RESULT_ROW: Record<AuditResult, string> = {
  COMPATIVEL: 'border-l-tertiary bg-white',
  PARCIALMENTE_COMPATIVEL: 'border-l-[#d97706] bg-[#fffbeb]',
  INCOMPATIVEL: 'border-l-error bg-error-container/20',
  INSUFICIENTE: 'border-l-outline-variant bg-surface-container-low',
  SEM_EVIDENCIA: 'border-l-outline-variant bg-surface-container-low',
};

// Grupos da barra de resumo; "Insuficiente" e "Sem evidência" contam juntos como sem sustentação.
type SummaryGroup = 'compativel' | 'parcial' | 'incompativel' | 'semSustentacao';

const GROUP_OF: Record<AuditResult, SummaryGroup> = {
  COMPATIVEL: 'compativel',
  PARCIALMENTE_COMPATIVEL: 'parcial',
  INCOMPATIVEL: 'incompativel',
  INSUFICIENTE: 'semSustentacao',
  SEM_EVIDENCIA: 'semSustentacao',
};

const GROUPS: Array<{ key: SummaryGroup; label: string; bar: string }> = [
  { key: 'compativel', label: 'compatível', bar: 'bg-tertiary' },
  { key: 'parcial', label: 'parcial', bar: 'bg-[#d97706]' },
  { key: 'incompativel', label: 'incompatível', bar: 'bg-error' },
  { key: 'semSustentacao', label: 'sem sustentação', bar: 'bg-outline-variant' },
];

const COMPONENTS: Array<{ key: StoryComponent; label: string; connector: string }> = [
  { key: 'perfil', label: 'Perfil', connector: 'Como' },
  { key: 'funcionalidade', label: 'Funcionalidade', connector: 'Quero' },
  { key: 'beneficio', label: 'Benefício', connector: 'Para' },
];

// Mesma regra do backend: "FN1" nunca vira a fonte F1.
const SOURCE_LABEL = /(?<![A-Za-z0-9])F\d+(?!\d)/g;
const sourcesOf = (item: AuditItem): string[] => [
  ...new Set([...item.problems, item.correction ?? ''].flatMap((text) => text.match(SOURCE_LABEL) ?? [])),
];

// Selo do resultado da auditoria; o título explica quando foi o código (não o modelo) que decidiu.
// Variantes: `filled` (fundo colorido), `plain` (só ícone e texto) e `outline` (sem fundo, borda fina na cor do resultado).
type BadgeVariant = 'filled' | 'plain' | 'outline';
const withoutBackground = (className: string) => className.split(' ').filter((c) => !c.startsWith('bg-')).join(' ');
const BADGE_VARIANT: Record<BadgeVariant, (className: string) => string> = {
  filled: (c) => `px-1.5 py-0.5 rounded ${c}`,
  plain: withoutBackground,
  outline: (c) => `px-1.5 py-0.5 rounded border border-current/40 ${withoutBackground(c)}`,
};

export const AuditBadge: React.FC<{ item: AuditItem; variant?: BadgeVariant }> = ({ item, variant = 'filled' }) => {
  const style = RESULT_STYLE[item.result];
  const title = item.byModel ? 'Avaliado pela IA a partir dos trechos vinculados' : 'Decidido pelo sistema: nenhum trecho vinculado ou item não avaliado';
  return (
    <span data-testid="audit-badge" title={title} className={`text-[10px] font-semibold inline-flex items-center gap-0.5 shrink-0 ${BADGE_VARIANT[variant](style.className)}`}>
      <span className="material-symbols-outlined text-[12px]">{style.icon}</span>
      {style.label}
    </span>
  );
};

const SummaryBar: React.FC<{ counts: Record<SummaryGroup, number>; total: number }> = ({ counts, total }) => (
  <div className="flex flex-col gap-2">
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-container" aria-hidden="true">
      {GROUPS.map((g) =>
        counts[g.key] > 0 ? <div key={g.key} className={g.bar} style={{ width: `${(counts[g.key] / total) * 100}%` }} /> : null
      )}
    </div>
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-on-surface-variant">
      {GROUPS.filter((g) => g.key !== 'semSustentacao' || counts[g.key] > 0).map((g) => (
        <li key={g.key} className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${g.bar}`} aria-hidden="true" />
          <span className="font-semibold text-on-surface">{counts[g.key]}</span> {g.label}
        </li>
      ))}
    </ul>
  </div>
);

const ClaimRow: React.FC<{ label: string; connector: string; text: string; item: AuditItem }> = ({ label, connector, text, item }) => {
  const sources = sourcesOf(item);
  const hasIssue = item.result !== 'COMPATIVEL';
  return (
    <li data-testid="audit-claim" className={`rounded-lg border border-surface-container border-l-4 p-3 flex flex-col gap-2 ${RESULT_ROW[item.result]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            {label} <span className="normal-case font-normal">({connector})</span>
          </span>
          <p className="text-xs text-on-surface leading-relaxed">{text || <span className="italic text-outline">Não informado</span>}</p>
        </div>
        <AuditBadge item={item} variant="plain" />
      </div>

      {hasIssue && (item.problems.length > 0 || item.correction) && (
        <ul className="flex flex-col gap-1 text-[11px] text-on-surface-variant leading-relaxed">
          {item.problems.map((problem, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="material-symbols-outlined text-[13px] mt-px text-outline">subdirectory_arrow_right</span>
              <span>{problem}</span>
            </li>
          ))}
          {item.correction && (
            <li className="flex items-start gap-1 italic">
              <span className="material-symbols-outlined text-[13px] mt-px text-outline not-italic">edit_note</span>
              <span>Correção sugerida (não aplicada): {item.correction}</span>
            </li>
          )}
        </ul>
      )}

      {sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-on-surface-variant">Evidências:</span>
          {sources.map((s) => (
            <span key={s} className="px-1.5 py-0.5 rounded bg-white border border-surface-container text-[10px] font-mono font-semibold text-primary">{s}</span>
          ))}
        </div>
      )}
    </li>
  );
};

interface EvidenceAuditPanelProps {
  audit: EvidenceAudit | null;
  issues: StructuralIssue[];
  /** O que a User Story afirma em cada componente (Como / Quero / Para). */
  texts: Record<StoryComponent, string>;
  auditing: boolean;
}

const scrollToCriteria = () =>
  document.getElementById('criteria-title')?.closest('section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

// Validação das evidências: estrutural (código) e semântica (IA, sem alterar a User Story).
export const EvidenceAuditPanel: React.FC<EvidenceAuditPanelProps> = ({ audit, issues, texts, auditing }) => {
  const errors = issues.filter((i) => i.severity === 'erro');
  const warnings = issues.filter((i) => i.severity === 'aviso');
  const claims = audit ? COMPONENTS.filter((c) => audit.components[c.key]) : [];
  const criteriaItems = audit ? Object.values(audit.criteria) : [];
  const allItems = [...claims.map((c) => audit!.components[c.key] as AuditItem), ...criteriaItems];

  const counts = allItems.reduce(
    (acc, item) => ({ ...acc, [GROUP_OF[item.result]]: acc[GROUP_OF[item.result]] + 1 }),
    { compativel: 0, parcial: 0, incompativel: 0, semSustentacao: 0 } as Record<SummaryGroup, number>
  );
  const total = allItems.length;
  const [expanded, setExpanded] = useState(false);
  const bodyId = 'evidence-audit-body';

  return (
    <section data-testid="evidence-audit" aria-labelledby="evidence-audit-title" aria-busy={auditing} className="bg-white rounded-xl p-6 shadow-xs border border-surface-container flex flex-col gap-4">
      <div className={`flex flex-wrap items-center justify-between gap-3 ${expanded ? 'pb-2 border-b border-surface-container' : ''}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">fact_check</span>
          </div>
          <div className="min-w-0">
            <h2 id="evidence-audit-title" className="text-base font-bold text-on-surface">Validação das Evidências</h2>
            <p className="text-xs text-on-surface-variant">Os trechos das fontes sustentam o que a User Story e os critérios afirmam?</p>
          </div>
        </div>
        {/* A auditoria é disparada em "Ações da Tarefa"; aqui só se expande/recolhe o resultado. */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={bodyId}
          className="px-3.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary text-xs font-semibold flex items-center gap-1 border border-surface-container transition-colors shadow-xs cursor-pointer"
        >
          <span className={`material-symbols-outlined text-[18px] transition-transform ${expanded ? 'rotate-180' : ''}`}>expand_more</span>
          <span>{expanded ? 'Recolher' : 'Expandir'}</span>
        </button>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {auditing ? 'Auditoria em andamento.' : audit ? `${counts.compativel} de ${total} afirmações compatíveis.` : ''}
      </div>

      {expanded && (
        <div id={bodyId} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {audit && (
              <span className="text-on-surface-variant inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                Auditoria por IA · {audit.date}
              </span>
            )}
            {audit?.outdated && (
              <span className="px-2 py-0.5 rounded bg-[#fef3c7] text-[#92400e] font-semibold" title="A User Story mudou depois desta auditoria.">
                Desatualizada: a User Story mudou depois da auditoria
              </span>
            )}
          </div>

          {issues.length > 0 && (
            <ul data-testid="structural-issues" className="flex flex-col gap-0.5 p-3 rounded-lg bg-surface-container-low border border-surface-container">
              {[...errors, ...warnings].map((issue, i) => (
                <li key={i} className={`text-[11px] flex items-start gap-1 ${issue.severity === 'erro' ? 'text-error' : 'text-[#92400e]'}`}>
                  <span className="material-symbols-outlined text-[13px] mt-px">{issue.severity === 'erro' ? 'error' : 'warning'}</span>
                  <span>{issue.message}</span>
                </li>
              ))}
            </ul>
          )}

          {!audit ? (
            <p className="text-xs text-on-surface-variant text-center py-3">
              Esta User Story ainda não foi auditada. Use "Auditar" em Ações da Tarefa para conferir se as fontes sustentam cada afirmação.
            </p>
          ) : (
            <>
              {total > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-on-surface">
                    <span className="font-bold">{counts.compativel} de {total}</span> afirmações sustentadas pelas fontes
                  </p>
                  <SummaryBar counts={counts} total={total} />
                </div>
              )}

              {claims.length > 0 && (
                <ol className={`flex flex-col gap-2 ${auditing ? 'opacity-60' : ''}`}>
                  {claims.map((c) => (
                    <ClaimRow key={c.key} label={c.label} connector={c.connector} text={texts[c.key]} item={audit.components[c.key] as AuditItem} />
                  ))}
                </ol>
              )}

              {criteriaItems.length > 0 && (
                <button type="button" onClick={scrollToCriteria} className="self-start text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer">
                  <span className="material-symbols-outlined text-[16px]">checklist</span>
                  Ver o resultado dos {criteriaItems.length} critério(s) de aceitação
                  <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
};
