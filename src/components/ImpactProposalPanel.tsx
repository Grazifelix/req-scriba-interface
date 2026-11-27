import React from 'react';
import { AudioEvidence, DocumentEvidence, Suggestion } from '../types.ts';
import { StoryText } from './StoryText.tsx';

const ORIGIN_LABELS: Record<string, string> = {
  fonte_nova: 'Fonte nova',
  evidencia_atual: 'Evidência atual',
};

// Rótulo da aprovação conforme o que ela faz com a User Story.
const APPROVE_LABELS: Record<string, string> = {
  confirmacao: 'Vincular evidências',
  complementacao: 'Aprovar e vincular evidências',
  modificacao: 'Aplicar alteração',
  contradicao: 'Aprovar e vincular evidências',
  nova_necessidade: 'Criar User Story',
  revisao_criterios: 'Aplicar novos critérios',
};

// O que acontece com o texto da User Story ao aprovar, quando ele não muda.
const NO_TEXT_CHANGE: Record<string, string> = {
  confirmacao: 'A nova fonte reafirma esta User Story. Aprovar não muda o texto: só vincula os trechos novos como evidência.',
  complementacao: 'A nova fonte complementa esta User Story sem mudar perfil, funcionalidade ou benefício. Aprovar vincula os trechos novos como evidência.',
  contradicao: 'As fontes divergem. O sistema não decide qual informação prevalece: aprovar mantém o texto atual e registra os trechos novos como evidência. Para mudar o texto, edite a User Story.',
  revisao_criterios: 'O texto da User Story não muda: a proposta troca só os critérios de aceitação.',
};

export interface ImpactProposalPanelProps {
  suggestion: Suggestion;
  /** Texto atual da User Story; vazio numa nova necessidade (a história ainda não existe). */
  currentText: string | null;
  busy: boolean;
  position?: { index: number; total: number; onPrevious: () => void; onNext: () => void };
  onApprove: () => void;
  onReject: () => void;
  /** false quando a tela já mostra os trechos em outro componente (ex.: lista de evidências com o áudio). */
  showExcerpts?: boolean;
}

const Excerpt: React.FC<{ title: string; location: string; quote: string }> = ({ title, location, quote }) => (
  <li className="bg-surface-container-low rounded-lg border border-surface-container p-2 text-[11px] flex flex-col gap-0.5">
    <span className="font-semibold text-on-surface">{title}{location && ` · ${location}`}</span>
    <span className="italic text-on-surface-variant line-clamp-3" title={quote}>"{quote}"</span>
  </li>
);

const NewExcerpts: React.FC<{ audio: AudioEvidence[]; documents: DocumentEvidence[] }> = ({ audio, documents }) => {
  if (audio.length + documents.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-on-surface">Trechos das novas fontes</span>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {audio.map((e) => <Excerpt key={e.id} title={e.title} location={e.timestamp} quote={e.quote} />)}
        {documents.map((e) => <Excerpt key={e.id} title={e.title} location={e.page} quote={e.quote} />)}
      </ul>
    </div>
  );
};

// Proposta da análise de novas fontes (ANALISE_IMPACTO_FONTES) ou de revisão de critérios: o que muda, por quê,
// com quais trechos, e a decisão do analista. Separada da "Sugestão de Melhoria de Texto" (reescrita da avaliação QUS).
export const ImpactProposalPanel: React.FC<ImpactProposalPanelProps> = ({
  suggestion, currentText, busy, position, onApprove, onReject, showExcerpts = true,
}) => {
  const {
    type, typeLabel, justification, proposedText, changedFields, outdated, baseVersion, currentVersion,
    reclassifiedFrom, affectedComponents, affectedCriteria, conflicts, alternativeText, possibleDuplicates,
    temporaryId, criteriaReview,
  } = suggestion;
  const isNewStory = currentText === null;
  const textChanges = isNewStory || !(type in NO_TEXT_CHANGE);

  return (
    <section data-testid="impact-proposal" className="bg-white rounded-xl p-6 shadow-xs border border-secondary/30 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-surface-container">
        <div>
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2 flex-wrap">
            <span className="material-symbols-outlined text-secondary text-[20px]">difference</span>
            <span>{criteriaReview ? 'Proposta de Critérios' : 'Propostas das Novas Fontes'}</span>
            <span className="px-2 py-0.5 rounded-full bg-secondary-fixed/40 text-secondary text-[11px] font-semibold">{typeLabel}</span>
            {temporaryId && (
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface text-[11px] font-mono font-semibold" title="Id temporário: o código definitivo (US-…) é atribuído ao aprovar">
                {temporaryId}
              </span>
            )}
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">Gerada a partir das fontes adicionadas ao projeto. Nada muda sem a sua decisão.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {position && position.total > 1 && (
            <div className="flex items-center gap-1 text-xs text-on-surface-variant font-semibold">
              <button type="button" onClick={position.onPrevious} disabled={position.index === 0} title="Proposta anterior" className="p-1 rounded hover:bg-surface-container disabled:opacity-40 cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <span>{position.index + 1} de {position.total}</span>
              <button type="button" onClick={position.onNext} disabled={position.index === position.total - 1} title="Próxima proposta" className="p-1 rounded hover:bg-surface-container disabled:opacity-40 cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          )}
          <button onClick={onReject} disabled={busy} type="button"
                  className="px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-error text-xs font-semibold flex items-center gap-1.5 border border-surface-container transition-colors shadow-xs disabled:opacity-50 cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">close</span>
            <span>Rejeitar</span>
          </button>
          <button onClick={onApprove} disabled={busy} type="button"
                  className="px-4 py-2 rounded-lg bg-secondary hover:opacity-90 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">check</span>
            <span>{APPROVE_LABELS[type] ?? 'Aplicar proposta'}</span>
          </button>
        </div>
      </div>

      {outdated && (
        <p data-testid="proposal-outdated" className="text-xs text-[#92400e] bg-[#fffbeb] border border-[#fcd34d] rounded-lg p-2.5 flex items-start gap-1.5">
          <span className="material-symbols-outlined text-[16px]">update</span>
          <span>
            A User Story mudou depois desta proposta (proposta feita sobre a v{baseVersion ?? '?'}; atual: v{currentVersion ?? '?'}).
            Ao aprovar, você vai confirmar se quer aplicar só os campos que a proposta altera, preservando o que mudou depois.
          </span>
        </p>
      )}

      <p className="text-xs text-on-surface"><span className="font-semibold">Justificativa da IA:</span> {justification}</p>
      {reclassifiedFrom && (
        <p className="text-[11px] text-on-surface-variant">
          A IA classificou como {reclassifiedFrom}; o sistema reclassificou porque a proposta {affectedComponents.length ? 'muda' : 'não muda'} perfil, funcionalidade ou benefício.
        </p>
      )}

      {textChanges ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-container-low rounded-xl p-4 border border-surface-container flex flex-col gap-2">
            <span className="text-[11px] text-outline font-semibold uppercase tracking-wider">Versão atual</span>
            <p className="text-xs text-on-surface italic leading-relaxed bg-white p-3 rounded-lg border border-surface-container">
              {isNewStory ? 'Nenhuma: esta necessidade ainda não existe no backlog.' : <StoryText text={currentText} />}
            </p>
          </div>
          <div className="bg-secondary-fixed/15 rounded-xl p-4 border border-secondary/30 flex flex-col gap-2">
            <span className="text-[11px] text-secondary font-semibold uppercase tracking-wider">{isNewStory ? 'História candidata' : 'Versão proposta'}</span>
            <p className="text-xs text-on-surface leading-relaxed bg-white p-3 rounded-lg border border-secondary/20"><StoryText text={proposedText} /></p>
            {!isNewStory && changedFields.length > 0 && (
              <span className="text-xs text-tertiary font-medium">Ao aplicar, muda: {changedFields.join(', ')}.</span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-on-surface-variant bg-surface-container-low rounded-lg p-3 border border-surface-container">{NO_TEXT_CHANGE[type]}</p>
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

      {criteriaReview && (
        <div data-testid="criteria-review" className="flex flex-col gap-1 text-[11px]">
          <span className="text-xs text-on-surface-variant">A User Story está aprovada: os critérios gerados pela IA só valem se você aplicar esta proposta.</span>
          {criteriaReview.added.map((c, i) => <span key={`n${i}`} className="text-tertiary">+ Novo: {c}</span>)}
          {criteriaReview.replaced.map((c, i) => <span key={`s${i}`} className="text-error">− Substituído: {c}</span>)}
          {criteriaReview.kept.map((c, i) => <span key={`m${i}`} className="text-on-surface-variant">= Mantido: {c}</span>)}
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

      {showExcerpts && <NewExcerpts audio={suggestion.audioEvidence} documents={suggestion.documentEvidence} />}
    </section>
  );
};
