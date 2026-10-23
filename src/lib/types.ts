export type OptionKey = 'A' | 'B' | 'C' | 'D';

export const OPTION_KEYS: readonly OptionKey[] = ['A', 'B', 'C', 'D'];

export type SubjectId =
  | 'english'
  | 'mathematics'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'government'
  | 'economics'
  | 'literature';

export interface Question {
  /** Stable identifier. Any string, unique across the bank. */
  id: string;
  subject: SubjectId;
  topic: string;
  prompt: string;
  options: Record<OptionKey, string>;
  answer: OptionKey;
  explanation: string;
  /** Where the item came from. Defaults to "Original practice set". */
  source?: string;
  year?: number;
}

/** A finished timed paper, kept for the progress screen. */
export interface SessionRecord {
  id: string;
  createdAt: number;
  subjectIds: SubjectId[];
  total: number;
  correct: number;
  durationSec: number;
  usedSec: number;
  /** Per-subject tally, so the progress screen can show where the marks are. */
  bySubject: Partial<Record<SubjectId, { total: number; correct: number }>>;
}

export type View = 'home' | 'practice' | 'exam' | 'progress' | 'import';
