import type { SessionRecord, SubjectId } from './types';

/** JAMB-style paper quotas: English 60 questions, every other subject 40. */
export const ENGLISH_QUESTIONS = 60;
export const OTHER_QUESTIONS = 40;
export const MARKS_PER_SUBJECT = 100;

export function quotaFor(id: SubjectId): number {
  return id === 'english' ? ENGLISH_QUESTIONS : OTHER_QUESTIONS;
}

/** Each subject is scored over 100, so a four-subject paper is out of 400. */
export function subjectScore(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(MARKS_PER_SUBJECT, Math.round((correct / total) * MARKS_PER_SUBJECT)));
}

export function sessionScore(session: SessionRecord): number {
  let score = 0;
  for (const value of Object.values(session.bySubject)) {
    if (!value || value.total <= 0) continue;
    score += subjectScore(value.correct, value.total);
  }
  return score;
}

export function sessionMaxScore(session: SessionRecord): number {
  let subjects = 0;
  for (const value of Object.values(session.bySubject)) {
    if (value && value.total > 0) subjects += 1;
  }
  return subjects * MARKS_PER_SUBJECT;
}
