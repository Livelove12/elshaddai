import type { Question } from '../lib/types';
import bank from './bank.json';

/** The full built-in bank, refined for Elshaddai and shipped with every build. */
export const BUNDLED_QUESTIONS = (bank as unknown as { questions: Question[] }).questions;
