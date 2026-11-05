export type ScreenType = 
  | 'home'
  | 'visao-geral'
  | 'follow-up'
  | 'avaliacao-qualidade'
  | 'projeto-ingestao'
  | 'projeto-fontes'
  | 'auth';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  company?: string;
  avatarUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  audiosCount: number;
  docsCount: number;
  filesSummary: string;
  status: 'andamento' | 'concluido';
  isFavorite: boolean;
}

export type StoryStatus = 'Em revisão' | 'Falta Informação' | 'Aprovada' | 'Desaprovada';

export interface TestCriterion {
  id: string;
  number: number;
  title: string;
  category: string;
  when: string;
  then: string;
}

export interface HeuristicItem {
  id: number;
  name: string;
  status: 'Atendido' | 'Atenção';
  description: string;
  tip?: string;
  category: '1. Estrutura do Texto' | '2. Sentido e Negócio' | '3. Prática e Execução';
}

export interface StoryVersion {
  version: string;
  type: string;
  timestamp: string;
  text: string;
  isCurrent?: boolean;
}

export interface UserStory {
  id: string;
  title: string;
  summary: string;
  status: StoryStatus;
  qualityScore: number;
  qualityLabel: string;
  actor: string;
  action: string;
  benefit: string;
  originalText: string;
  optimizedText: string;
  suggestionApplied: boolean;
  ambiguityNotice: string;
  optimizedBenefit: string;
  criteria: TestCriterion[];
  hasAttentionGap?: boolean;
  attentionGapMessage?: string;
  sources: {
    audio?: {
      title: string;
      timestamp: string;
      quote: string;
      durationLabel: string;
      durationSec: number;
      audioUrl?: string;
    };
    doc?: {
      title: string;
      page: string;
      quote: string;
      docUrl?: string;
    };
  };
  heuristics: HeuristicItem[];
  versions: StoryVersion[];
}

export interface FollowUpQuestion {
  id: string;
  storyId: string;
  storyTitle: string;
  question: string;
  status: 'Pendente' | 'Aprovada' | 'Respondida';
  note?: string;
  assignedRole?: string;
  answer?: string;
}

export interface AudioSource {
  id: string;
  title: string;
  durationLabel: string;
  durationSec: number;
  status: 'Transcrito' | 'Processando';
  dialogues: Array<{
    timestamp: string;
    speaker: string;
    text: string;
  }>;
}

export interface DocumentSource {
  id: string;
  title: string;
  category: string;
  readPercentage: string;
  type: 'pdf' | 'xlsx';
  sections: Array<{
    heading: string;
    content: string[];
  }>;
}

export interface StagedFile {
  id: string;
  name: string;
  size: string;
  type: 'audio' | 'pdf' | 'spreadsheet';
  typeLabel: string;
  status: 'Pronto' | 'Enviando';
}
