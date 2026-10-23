import type { SubjectId } from '../lib/types';

export interface Subject {
  id: SubjectId;
  name: string;
  short: string;
  blurb: string;
}

export const SUBJECTS: Subject[] = [
  {
    id: 'english',
    name: 'English Language',
    short: 'English',
    blurb: 'Concord, lexis, idioms and the comprehension habits JAMB rewards.',
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    short: 'Maths',
    blurb: 'Algebra, geometry, statistics and number bases, worked step by step.',
  },
  {
    id: 'physics',
    name: 'Physics',
    short: 'Physics',
    blurb: 'Mechanics, electricity and waves, with the units that carry the marks.',
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    short: 'Chemistry',
    blurb: 'Atomic structure, bonding, gas laws and the reactions that recur.',
  },
  {
    id: 'biology',
    name: 'Biology',
    short: 'Biology',
    blurb: 'Cells, systems, genetics and classification — the definitions examiners use.',
  },
  {
    id: 'government',
    name: 'Government',
    short: 'Government',
    blurb: 'Constitutional ideas, federalism and the Nigerian political timeline.',
  },
  {
    id: 'economics',
    name: 'Economics',
    short: 'Economics',
    blurb: 'Demand and supply, cost, money and the measures of a national economy.',
  },
];

const INDEX = new Map<SubjectId, Subject>(SUBJECTS.map((subject) => [subject.id, subject]));

export function subjectById(id: SubjectId): Subject {
  return INDEX.get(id) ?? { id, name: id, short: id, blurb: '' };
}
