export type ScreenType =
  | 'home'
  | 'visao-geral'
  | 'follow-up'
  | 'avaliacao-qualidade'
  | 'novo-requisito'
  | 'projeto-ingestao'
  | 'projeto-fontes'
  | 'perfil';

export interface Project {
  id: string;
  name: string;
  description: string;
  /** "Sistema" da análise das fontes mais recente; vazio enquanto o projeto não tem análise. */
  systemDescription: string;
  audiosCount: number;
  docsCount: number;
  filesSummary: string;
  qualityScore: number | null;
  qualityLabel: string;
}

export type StoryStatus = 'Em revisão' | 'Falta Informação' | 'Aprovada' | 'Desaprovada';

export interface TestCriterion {
  id: string;
  title: string;
  criterion: string;
}

export type HeuristicCategory = '1. Estrutura do Texto' | '2. Sentido e Negócio' | '3. Prática e Execução';

export interface HeuristicItem {
  id: string;
  name: string;
  status: 'Atendido' | 'Atenção' | 'Não atende';
  description: string;
  tip?: string;
  category: HeuristicCategory;
}

export interface StoryVersion {
  version: string;
  type: string;
  isAi: boolean;
  author: string;
  timestamp: string;
  text: string;
  isCurrent: boolean;
}

export interface AudioEvidence {
  id: string;
  title: string;
  timestamp: string;
  quote: string;
  url: string;
}

export interface DocumentEvidence {
  id: string;
  title: string;
  page: string;
  quote: string;
}

export interface StorySummary {
  id: string;
  code: string;
  title: string;
  summary: string;
  status: StoryStatus;
  qualityScore: number | null;
  qualityLabel: string;
  hasMissingInfo: boolean;
  /** Reescrita da avaliação de qualidade mais recente ("Sugestão Otimizada"). */
  qualityRewrite: string | null;
}

export interface UserStory extends StorySummary {
  actor: string;
  action: string;
  benefit: string;
  criteria: TestCriterion[];
  qualityOutdated: boolean;
  missingInfo: string[];
  unsupportedClaims: string[];
  audioEvidence: AudioEvidence[];
  documentEvidence: DocumentEvidence[];
  heuristics: HeuristicItem[];
  versions: StoryVersion[];
}

export type QuestionStatus = 'Pendente' | 'Aprovada' | 'Respondida' | 'Rejeitada';

export interface FollowUpQuestion {
  id: string;
  storyId: string;
  storyCode: string;
  storyTitle: string;
  question: string;
  note: string;
  status: QuestionStatus;
  answer: string | null;
}

export type SourceStatus = 'pendente' | 'processando' | 'concluido' | 'erro';

export interface AudioSource {
  id: string;
  title: string;
  durationLabel: string | null;
  status: SourceStatus;
  statusLabel: string;
  errorMessage: string | null;
  canRetry: boolean;
  url: string;
}

export interface DocumentSource {
  id: string;
  title: string;
  isSpreadsheet: boolean;
  status: SourceStatus;
  statusLabel: string;
  errorMessage: string | null;
  canRetry: boolean;
  pageCount: number | null;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  startSec: number;
  endSec: number;
  startLabel: string;
  edited: boolean;
}

export interface StagedFile {
  id: string;
  file: File;
  type: 'audio' | 'pdf' | 'spreadsheet';
  typeLabel: string;
  errorMessage?: string;
}

export interface Suggestion {
  id: string;
  storyId: string | null;
  storyCode: string | null;
  type: string;
  typeLabel: string;
  justification: string;
  proposedText: string;
  proposedTitle: string;
  proposedCriteria: string[];
  currentText: string | null;
  changedFields: string[];
  audioEvidence: AudioEvidence[];
  documentEvidence: DocumentEvidence[];
}

export type JobStatus = SourceStatus;

export type JobType = 'geracao_historias' | 'analise_fontes' | 'analise_atualizacao' | 'avaliacao_qualidade';

export type AnalysisItemType = 'usuario' | 'requisito_negocio' | 'funcionalidade' | 'termo' | 'fora_de_escopo' | 'participante';

export interface AnalysisItem {
  id: string;
  type: AnalysisItemType;
  code: string | null;
  text: string;
  complement: string;
  references: string[];
  hasEvidence: boolean;
  sourceNames: string[];
}

export interface ProjectAnalysis {
  id: string;
  jobId: string | null;
  system: string;
  reviewed: boolean;
  items: AnalysisItem[];
}

export interface Job {
  id: string;
  type: JobType;
  typeLabel: string;
  isAnalysis: boolean;
  status: JobStatus;
  statusLabel: string;
  errorMessage: string | null;
  createdAt: string;
  audioIds: number[];
  documentIds: number[];
  /** Histórias do job de avaliação em lote. */
  storyIds: number[];
  createdCount: number;
  createdStoryIds: number[];
  analysisId: string | null;
  resultMessage: string | null;
  failureCount: number;
}
