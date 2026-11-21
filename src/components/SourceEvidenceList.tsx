import React from 'react';
import { AudioEvidence, DocumentEvidence } from '../types.ts';

interface SourceEvidenceListProps {
  audioEvidence: AudioEvidence[];
  documentEvidence: DocumentEvidence[];
  onOpenSources: () => void;
  subtitle?: string;
  emptyText?: string;
}

// Trechos de áudio e documentos que embasam uma User Story ou uma sugestão da IA.
export const SourceEvidenceList: React.FC<SourceEvidenceListProps> = ({
  audioEvidence,
  documentEvidence,
  onOpenSources,
  subtitle = 'De onde as informações desta tarefa foram extraídas',
  emptyText = 'Esta User Story não tem evidências vinculadas às fontes.',
}) => {
  const sourceCount = audioEvidence.length + documentEvidence.length;

  return (
    <section className="bg-white rounded-xl p-6 shadow-xs border border-surface-container flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-surface-container">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">account_tree</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-on-surface">Origem e Rastreabilidade das Fontes</h2>
            <p className="text-xs text-on-surface-variant">{subtitle}</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-surface-container-low text-on-surface-variant text-xs font-semibold flex items-center gap-1 border border-surface-container">
          <span className="material-symbols-outlined text-[14px] text-primary">verified</span>
          {sourceCount} Evidência(s)
        </span>
      </div>

      {sourceCount === 0 && <p className="text-xs text-on-surface-variant text-center py-3">{emptyText}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {audioEvidence.map((evidence) => (
          <div key={evidence.id} data-testid="audio-evidence" className="bg-surface-container-low rounded-xl p-4 border border-surface-container flex flex-col gap-2">
            <span className="text-[11px] text-primary font-semibold uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">mic</span>
              Áudio de Origem
            </span>
            <h3 className="text-xs font-bold text-on-surface">{evidence.title}</h3>
            <div className="bg-white p-3 rounded-lg border border-surface-container text-xs text-on-surface-variant leading-relaxed">
              <strong className="text-primary font-bold font-mono text-[11px] flex items-center gap-1 mb-1">
                <span className="material-symbols-outlined text-[13px]">schedule</span>
                {evidence.timestamp}
              </strong>
              <span className="italic text-on-surface">{evidence.quote}</span>
            </div>
            {evidence.url && <audio src={evidence.url} controls preload="none" aria-label={`Ouvir trecho de ${evidence.title}`} className="w-full h-9" />}
            <button onClick={onOpenSources} type="button" className="self-end text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer">
              <span>Ver transcrição inteira</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        ))}

        {documentEvidence.map((evidence) => (
          <div key={evidence.id} data-testid="document-evidence" className="bg-surface-container-low rounded-xl p-4 border border-surface-container flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-secondary font-semibold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">description</span>
                Documento de Origem
              </span>
              <span className="px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed-variant text-[11px] font-semibold">{evidence.page}</span>
            </div>
            <h3 className="text-xs font-bold text-on-surface">{evidence.title}</h3>
            <div className="bg-white p-3 rounded-lg border border-surface-container text-xs text-on-surface-variant leading-relaxed italic">{evidence.quote}</div>
            <button onClick={onOpenSources} type="button" className="self-end text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer">
              <span>Ver no documento</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
