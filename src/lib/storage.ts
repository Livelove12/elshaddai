import type { Question, SessionRecord, SubjectId } from './types';

const PREFIX = 'elshaddai.v1.';

function read<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* Storage full or blocked — the app keeps working in memory. */
  }
}

function remove(key: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export const store = {
  questions: {
    load: (): Question[] => read<Question[]>('questions', []),
    save: (questions: Question[]): void => write('questions', questions),
  },
  sessions: {
    load: (): SessionRecord[] => read<SessionRecord[]>('sessions', []),
    save: (sessions: SessionRecord[]): void => write('sessions', sessions),
  },
  filters: {
    load: (): SubjectId | 'all' => read<SubjectId | 'all'>('filter', 'all'),
    save: (filter: SubjectId | 'all'): void => write('filter', filter),
  },
  clearUserData: (): void => {
    remove('questions');
    remove('sessions');
    remove('filter');
  },
};
