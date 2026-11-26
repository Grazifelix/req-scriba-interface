import React from 'react';
import { AuditItem, AuditResult, EvidenceAudit, StoryComponent, StructuralIssue } from '../types.ts';

const RESULT_STYLE: Record<AuditResult, { label: string; className: string; icon: string }> = {
  COMPATIVEL: { label: 'Compatível', className: 'bg-tertiary-fixed text-on-tertiary-fixed-variant', icon: 'check' },
  PARCIALMENTE_COMPATIVEL: { label: 'Parcial', className: 'bg-[#fef3c7] text-[#92400e]', icon: 'contrast' },
  INCOMPATIVEL: { label: 'Incompatível', className: 'bg-error-container text-on-error-container', icon: 'close' },
  INSUFICIENTE: { label: 'Insuficiente', className: 'bg-surface-container-high text-on-surface-variant', icon: 'help' },
  SEM_EVIDENCIA: { label: 'Sem evidência', className: 'bg-surface-container-high text-on-surface-variant', icon: 'link_off' },
};

const COMPONENT_LABELS: Record<StoryComponent, string> = {
  perfil: 'Perfil (Como)',
  funcionalidade: 'Funcionalidade (Quero)',
  beneficio: 'Benefício (Para)',
};

// Selo do resultado da auditoria; o título explica quando foi o código (não o modelo) que decidiu.
export const AuditBadge: React.FC<{ item: AuditItem }> = ({ item }) => {
  const style = RESULT_STYLE[item.result];
  const title = item.byModel ? 'Avaliado pela IA a partir dos trechos vinculados' : 'Decidido pelo sistema: nenhum trecho vinculado ou item não avaliado';
  return (
    <span data-testid="audit-badge" title={title} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold inline-flex items-center gap-0.5 ${style.className}`}>
      <span className="material-symbols-outlined text-[12px]">{style.icon}</span>
      {style.label}
    </span>
  );
};

export const AuditDetails: React.FC<{ item: AuditItem }> = ({ item }) => {
  if (item.result === 'COMPATIVEL' && item.problems.length === 0) return null;
  return (
    <ul className="flex flex-col gap-0.5 text-[11px] text-on-surface-variant">
      {item.unsupportedParts.length > 0 && <li>Sem sustentação: {item.unsupportedParts.join(', ')}</li>}
      {item.problems.map((problem, i) => <li key={i}>• {problem}</li>)}
      {item.correction && <li className="italic">Correção sugerida (não aplicada): {item.correction}</li>}
    </ul>
  );
};

interface EvidenceAuditPanelProps {
  audit: EvidenceAudit | null;
  issues: StructuralIssue[];
  busy: boolean;
  auditing: boolean;
  onAudit: () => void;
}

// Validação das evidências: estrutural (código) e semântica (IA, sem alterar a User Story).
export const EvidenceAuditPanel: React.FC<EvidenceAuditPanelProps> = ({ audit, issues, busy, auditing, onAudit }) => {
  const errors = issues.filter((i) => i.severity === 'erro');
  const warnings = issues.filter((i) => i.severity === 'aviso');
  const components = audit ? (Object.entries(audit.components) as Array<[StoryComponent, AuditItem]>) : [];

  return (
    <section data-testid="evidence-audit" className="bg-white rounded-xl p-6 shadow-xs border border-surface-container flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-surface-container">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">fact_check</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-on-surface">Validação das Evidências</h2>
            <p className="text-xs text-on-surface-variant">Os trechos das fontes sustentam o que a User Story e os critérios afirmam?</p>
          </div>
        </div>
        <button onClick={onAudit} disabled={busy} type="button" className="px-3.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary text-xs font-semibold flex items-center gap-1 border border-surface-container transition-colors shadow-xs disabled:opacity-50 cursor-pointer">
          <span className="material-symbols-outlined text-[18px]">policy</span>
          <span>{auditing ? 'Auditando...' : audit ? 'Auditar novamente' : 'Auditar evidências'}</span>
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-on-surface">Verificação estrutural</span>
        {issues.length === 0 ? (
          <p className="text-xs text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-tertiary">check_circle</span>
            Referências, ids e vínculos íntegros.
          </p>
        ) : (
          <ul data-testid="structural-issues" className="flex flex-col gap-0.5">
            {[...errors, ...warnings].map((issue, i) => (
              <li key={i} className={`text-[11px] flex items-start gap-1 ${issue.severity === 'erro' ? 'text-error' : 'text-[#92400e]'}`}>
                <span className="material-symbols-outlined text-[13px] mt-px">{issue.severity === 'erro' ? 'error' : 'warning'}</span>
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-on-surface">Auditoria semântica (IA)</span>
          {audit && (
            <>
              <span className="text-[11px] text-on-surface-variant">
                {audit.compatible} de {audit.total} afirmações compatíveis · {audit.date}
              </span>
              {audit.outdated && (
                <span className="px-2 py-0.5 rounded bg-[#fef3c7] text-[#92400e] text-[11px] font-semibold" title="A User Story mudou depois desta auditoria.">
                  Desatualizada
                </span>
              )}
            </>
          )}
        </div>
        {!audit && <p className="text-xs text-on-surface-variant">Ainda não auditada.</p>}
        {components.map(([name, item]) => (
          <div key={name} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface">{COMPONENT_LABELS[name]}</span>
              <AuditBadge item={item} />
            </div>
            <AuditDetails item={item} />
          </div>
        ))}
        {audit && Object.keys(audit.criteria).length > 0 && (
          <p className="text-[11px] text-on-surface-variant">O resultado de cada critério aparece no card de critérios acima.</p>
        )}
      </div>
    </section>
  );
};
