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

/** Trecho de fonte que sustenta um critério de aceitação, com as partes (Dado/Quando/Então) sustentadas. */
export interface CriterionSource {
  chunkId: number;
  parts: string[];
  fileName: string;
  location: string;
  quote: string;
}

export type AuditResult = 'COMPATIVEL' | 'PARCIALMENTE_COMPATIVEL' | 'INCOMPATIVEL' | 'INSUFICIENTE' | 'SEM_EVIDENCIA';

/** Resultado da auditoria semântica (VALIDACAO_EVIDENCIAS) para um componente da história ou um critério. */
export interface AuditItem {
  result: AuditResult;
  problems: string[];
  correction: string | null;
  /** Partes do critério (Dado/Quando/Então) que os trechos não sustentam. */
  unsupportedParts: string[];
  /** false quando o resultado foi decidido pelo código (ex.: nenhum trecho vinculado). */
  byModel: boolean;
}

export type StoryComponent = 'perfil' | 'funcionalidade' | 'beneficio';

export interface EvidenceAudit {
  id: string;
  outdated: boolean;
  date: string;
  components: Partial<Record<StoryComponent, AuditItem>>;
  criteria: Record<number, AuditItem>;
  total: number;
  compatible: number;
  attention: number;
}

/** Problema da validação estrutural (feita por código, sem LLM). */
export interface StructuralIssue {
  type: string;
  severity: 'erro' | 'aviso';
  target: string;
  message: string;
}

export interface TestCriterion {
  id: string;
  /** Id permanente do critério (tabela criterios_aceitacao). */
  criterionId?: number;
  title: string;
  criterion: string;
  /** Partes separadas; presentes nos critérios gerados pela IA (GERACAO_CRITERIOS_ACEITACAO). */
  given?: string;
  when?: string;
  then?: string;
  sources: CriterionSource[];
  /** Sinalizações da validação: sem evidência, citação não encontrada, referência inexistente. */
  warnings: string[];
  aiGenerated: boolean;
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
  /** Lacunas registradas pela etapa de critérios (o que falta nas fontes para escrevê-los). */
  criteriaGaps: string[];
  evidenceAudit: EvidenceAudit | null;
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

export type JobType =
  | 'geracao_historias'
  | 'analise_fontes'
  | 'analise_atualizacao'
  | 'avaliacao_qualidade'
  | 'geracao_criterios'
  | 'auditoria_evidencias';

/** Etapa do pipeline de geração (resultado.etapas do job), atualizada enquanto o job roda. */
export interface JobStage {
  name: string;
  label: string;
  status: 'em_andamento' | 'concluida' | 'erro' | 'ignorada';
  durationSec: number;
  error: string | null;
}

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
  stages: JobStage[];
  /** Histórias gravadas sem critérios porque a etapa de critérios falhou para elas. */
  criteriaFailureCount: number;
}
