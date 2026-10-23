import { OPTION_KEYS, type OptionKey, type Question, type SubjectId } from './types';
import { SUBJECTS } from '../data/subjects';

export interface ParseResult {
  questions: Question[];
  errors: string[];
}

const SUBJECT_IDS = new Set<string>(SUBJECTS.map((subject) => subject.id));

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function normaliseOptions(value: unknown, where: string, errors: string[]): Record<OptionKey, string> | null {
  const record = asRecord(value);
  if (!record) {
    errors.push(`${where}: "options" must be an object with keys A, B, C and D.`);
    return null;
  }
  const out = {} as Record<OptionKey, string>;
  for (const key of OPTION_KEYS) {
    const raw = record[key] ?? record[key.toLowerCase()];
    if (typeof raw !== 'string' || !raw.trim()) {
      errors.push(`${where}: option ${key} is missing.`);
      return null;
    }
    out[key] = raw.trim();
  }
  return out;
}

/**
 * Accepts either a bare array of questions or `{ "questions": [ ... ] }`.
 * Only the fields this app uses are read; everything else is ignored.
 */
export function parseQuestions(raw: string): ParseResult {
  const errors: string[] = [];
  if (!raw.trim()) return { questions: [], errors: ['Nothing to import — the box is empty.'] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { questions: [], errors: [`That is not valid JSON: ${(error as Error).message}`] };
  }

  const record = asRecord(parsed);
  const list = Array.isArray(parsed) ? parsed : record && Array.isArray(record.questions) ? record.questions : null;

  if (!list) {
    return { questions: [], errors: ['Expected a JSON array, or an object with a "questions" array.'] };
  }

  const questions: Question[] = [];
  const seen = new Set<string>();

  list.forEach((item, index) => {
    const where = `Item ${index + 1}`;
    const entry = asRecord(item);
    if (!entry) {
      errors.push(`${where}: each question must be a JSON object.`);
      return;
    }

    const prompt = typeof entry.prompt === 'string' ? entry.prompt.trim() : '';
    const explanation = typeof entry.explanation === 'string' ? entry.explanation.trim() : '';
    const topic = typeof entry.topic === 'string' && entry.topic.trim() ? entry.topic.trim() : 'General';
    const subject = typeof entry.subject === 'string' ? entry.subject.trim().toLowerCase() : '';

    if (!prompt) errors.push(`${where}: "prompt" is required.`);
    if (!explanation) errors.push(`${where}: "explanation" is required.`);
    if (!SUBJECT_IDS.has(subject)) {
      errors.push(
        `${where}: unknown subject "${subject || '(missing)'}". Use one of: ${[...SUBJECT_IDS].join(', ')}.`,
      );
    }

    const options = normaliseOptions(entry.options, where, errors);
    const answerRaw = typeof entry.answer === 'string' ? entry.answer.trim().toUpperCase() : '';
    const answer = OPTION_KEYS.includes(answerRaw as OptionKey) ? (answerRaw as OptionKey) : null;
    if (!answer) errors.push(`${where}: "answer" must be one of A, B, C, D.`);

    if (!prompt || !explanation || !options || !answer || !SUBJECT_IDS.has(subject)) return;

    const baseId = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : `imp-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (seen.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    seen.add(id);

    const year = typeof entry.year === 'number' && Number.isFinite(entry.year) ? entry.year : undefined;

    questions.push({
      id,
      subject: subject as SubjectId,
      topic,
      prompt,
      options,
      answer,
      explanation,
      source: typeof entry.source === 'string' && entry.source.trim() ? entry.source.trim() : 'Original practice set',
      year,
    });
  });

  return { questions, errors };
}

/** Keeps the newest version of a question when an id is imported twice. */
export function mergeQuestions(existing: Question[], incoming: Question[]): Question[] {
  const byId = new Map(existing.map((question) => [question.id, question]));
  for (const question of incoming) byId.set(question.id, question);
  return [...byId.values()];
}
