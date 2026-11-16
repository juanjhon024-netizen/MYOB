export type NavPage =
  | 'dashboard'
  | 'course_room'
  | 'modules'
  | 'episode'
  | 'videos'
  | 'virtual_lab'
  | 'quiz'
  | 'grades'
  | 'content_manager'
  | 'guide'
  | 'settings';

export type StageStatus = 'belum_dimulai' | 'sedang_dipelajari' | 'selesai';

export type LearningStageKey =
  | 'materi'
  | 'video'
  | 'simulasi'
  | 'uji_mandiri'
  | 'kuis';

export interface StudentProfile {
  studentCode: string;
  fullName: string;
  className: string;
  createdAt: string;
  lastActiveAt: string;
  isDisabled?: boolean;
  disabledAt?: string;
}

export interface MaterialSection {
  id: string;
  title: string;
  body: string;
  keyPoints?: string[];
  warningNote?: string;
}

export interface CaseStudyData {
  companyName: string;
  businessType: string;
  fiscalYear: string;
  lastMonth: string;
  periodsPerYear: string;
  address?: string;
  notes?: string;
}

export interface VideoInfo {
  title: string;
  duration: string;
  localPath?: string;
  stepsSummary: string[];
  description: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface GuidedSimulationStep {
  id: string;
  title: string;
  instruction: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'select' | 'choice';
  options?: string[];
  expectedAnswer: string;
  placeholder?: string;
  hint1Location: string;
  hint2Concept: string;
  hint3Solution: string;
}

export interface GuidedSimulationConfig {
  enabled: boolean;
  title: string;
  caseSummary: string;
  caseFacts: Array<{ label: string; value: string }>;
  steps: GuidedSimulationStep[];
  updatedAt?: string;
}

export interface EpisodeContent {
  id: string;
  moduleId: string;
  code: string;
  title: string;
  subtitle: string;
  hasContent: boolean;
  hasVirtualLab?: boolean;
  guidedSimulation?: GuidedSimulationConfig;
  objectives: string[];
  caseStudy?: CaseStudyData;
  materials: MaterialSection[];
  videoInfo?: VideoInfo;
  quizQuestions: QuizQuestion[];
  pdfAttachmentId?: string;
  pdfAttachmentName?: string;
  videoAttachmentId?: string;
  videoAttachmentName?: string;
  isCustom?: boolean;
  updatedAt?: string;
}

export interface ModuleData {
  id: string;
  code: string;
  title: string;
  description: string;
  episodes: EpisodeContent[];
}

export interface SimulationFormValues {
  actionSelected: '' | 'open' | 'create' | 'explore' | 'whats_new' | 'exit';
  companyName: string;
  businessType: string;
  fiscalYear: string;
  lastMonth: string;
  periodsPerYear: string;
}

export interface FieldValidationResult {
  field: string;
  label: string;
  expected: string;
  actual: string;
  isValid: boolean;
  message: string;
}

export type CheckpointStatus = 'belum' | 'berhasil' | 'perlu_diperbaiki';

export interface SimulationAttemptRecord {
  episodeId: string;
  guidedCompleted: boolean;
  guidedHintsUsed: number;
  guidedErrors: number;
  independentAttempts: number;
  independentErrors: number;
  independentCompleted: boolean;
  checkpointStatus: CheckpointStatus;
  lastSubmittedValues?: SimulationFormValues;
  customAnswers?: Record<string, string>;
  lastFieldResults?: FieldValidationResult[];
  lastUpdatedAt?: string;
}

export interface QuizAttemptRecord {
  episodeId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  answers: Record<string, number>;
  submittedAt: string;
  attempts: number;
}

export interface StudentProgress {
  studentCode: string;
  lastOpenedEpisodeId: string;
  stageStatuses: Record<string, Record<LearningStageKey, StageStatus>>;
  materialsRead: Record<string, boolean>;
  videosWatched: Record<string, boolean>;
  simulations: Record<string, SimulationAttemptRecord>;
  quizResults: Record<string, QuizAttemptRecord>;
  updatedAt: string;
}

export interface StoredMediaRecord {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  blob: Blob;
  createdAt: string;
}

export interface ContentBackupPayload {
  version: number;
  exportedAt: string;
  episodes: EpisodeContent[];
  media: Array<{
    id: string;
    name: string;
    mimeType: string;
    size: number;
    createdAt: string;
    base64Data: string;
  }>;
}
