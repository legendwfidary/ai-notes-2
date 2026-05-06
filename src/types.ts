export interface NoteTopic {
  title: string;
  content: string;
  subtopics?: NoteTopic[];
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface StudyGuide {
  title: string;
  summary: string;
  keyTakeaways: string[];
  structuredNotes: NoteTopic[];
  flashcards: Flashcard[];
}

export enum PipelineStep {
  IDLE = 'idle',
  PREPARING = 'preparing',
  TRANSCRIBING = 'transcribing',
  CLEANING = 'cleaning',
  STRUCTURING = 'structuring',
  SUMMARIZING = 'summarizing',
  FLASHCARDS = 'flashcards',
  FINALIZING = 'finalizing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface PipelineProgress {
  step: PipelineStep;
  message: string;
}
