import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SUBJECTS, subjectById } from '../data/subjects';
import type { OptionKey, Question, SessionRecord, SubjectId } from '../lib/types';
import { formatClock, newId, percent, plural, shuffle } from '../lib/utils';
import { Modal } from './Modal';
import { OptionList } from './OptionList';
import { RichText } from './RichText';

type Phase = 'setup' | 'running' | 'done';

interface Outcome extends SessionRecord {
  timedOut: boolean;
}

const COUNT_CHOICES = [10, 20, 40, 60];
const MIN_SUBJECTS = 2;
const MAX_SUBJECTS = 4;
const MAX_MINUTES = 120;

function clampMinutes(raw: string): number {
  if (!raw.trim()) return MAX_MINUTES;
  const value = Math.round(Number(raw));
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.min(MAX_MINUTES, value);
}

function drawPaper(pool: Question[], subjectIds: SubjectId[], count: number): Question[] {
  const target = Math.min(count, pool.length);
  if (target === 0) return [];

  const buckets = subjectIds
    .map((id) => ({ id, items: shuffle(pool.filter((question) => question.subject === id)) }))
    .filter((bucket) => bucket.items.length > 0);
  if (buckets.length === 0) return [];

  const base = Math.floor(target / buckets.length);
  let extra = target - base * buckets.length;
  const picked: Question[] = [];

  for (const bucket of shuffle(buckets)) {
    const quota = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra -= 1;
    picked.push(...bucket.items.slice(0, Math.min(quota, bucket.items.length)));
  }

  if (picked.length < target) {
    const used = new Set(picked.map((question) => question.id));
    const rest = shuffle(pool.filter((question) => !used.has(question.id)));
    picked.push(...rest.slice(0, target - picked.length));
  }

  return shuffle(picked);
}

interface ExamProps {
  questions: Question[];
  onSession: (session: SessionRecord) => void;
}

export function Exam({ questions, onSession }: ExamProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [subjectIds, setSubjectIds] = useState<SubjectId[]>(['english']);
  const [count, setCount] = useState(20);
  const [minutesDraft, setMinutesDraft] = useState(String(MAX_MINUTES));
  const minutes = clampMinutes(minutesDraft);

  const [paper, setPaper] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [flags, setFlags] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [deadline, setDeadline] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const finished = useRef(false);

  const pool = useMemo(
    () => questions.filter((question) => subjectIds.includes(question.subject)),
    [questions, subjectIds],
  );
  const paperSize = Math.min(count, pool.length);
  const englishAvailable = questions.filter((question) => question.subject === 'english').length;
  const atSubjectLimit = subjectIds.length >= MAX_SUBJECTS;
  const canStart =
    pool.length > 0 &&
    subjectIds.length >= MIN_SUBJECTS &&
    subjectIds.includes('english') &&
    englishAvailable > 0;
  const current = paper[index];
  const answeredCount = paper.reduce((total, question) => total + (answers[question.id] ? 1 : 0), 0);

  const start = useCallback(() => {
    if (pool.length === 0 || subjectIds.length < MIN_SUBJECTS || !subjectIds.includes('english')) return;
    finished.current = false;
    setMinutesDraft(String(minutes));
    setPaper(drawPaper(pool, subjectIds, count));
    setAnswers({});
    setFlags([]);
    setIndex(0);
    setOutcome(null);
    setRemaining(minutes * 60);
    setDeadline(Date.now() + minutes * 60 * 1000);
    setPhase('running');
  }, [count, minutes, pool, subjectIds]);

  const finish = useCallback(
    (timedOut: boolean) => {
      if (finished.current || paper.length === 0) return;
      finished.current = true;

      const bySubject: SessionRecord['bySubject'] = {};
      let correct = 0;
      for (const question of paper) {
        const bucket = bySubject[question.subject] ?? (bySubject[question.subject] = { total: 0, correct: 0 });
        bucket.total += 1;
        if (answers[question.id] === question.answer) {
          bucket.correct += 1;
          correct += 1;
        }
      }

      const durationSec = minutes * 60;
      const usedSec = timedOut ? durationSec : Math.max(0, durationSec - remaining);
      const record: SessionRecord = {
        id: newId('ses'),
        createdAt: Date.now(),
        subjectIds,
        total: paper.length,
        correct,
        durationSec,
        usedSec,
        bySubject,
      };

      onSession(record);
      setOutcome({ ...record, timedOut });
      setPhase('done');
    },
    [answers, minutes, onSession, paper, remaining, subjectIds],
  );

  useEffect(() => {
    if (phase !== 'running') return;
    const tick = () => setRemaining(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [phase, deadline]);

  useEffect(() => {
    if (phase === 'running' && deadline > 0 && remaining <= 0) finish(true);
  }, [phase, deadline, remaining, finish]);

  const toggleSubject = (id: SubjectId) => {
    if (id === 'english') return;
    setSubjectIds((value) => {
      if (value.includes(id)) return value.filter((item) => item !== id);
      if (value.length >= MAX_SUBJECTS) return value;
      return [...value, id];
    });
  };

  const choose = (key: OptionKey) => {
    if (!current) return;
    setAnswers((value) => ({ ...value, [current.id]: key }));
  };

  /* ── Setup ─────────────────────────────────────────────────────────── */
  if (phase === 'setup') {
    return (
      <section className="section">
        <div className="wrap wrap-narrow">
          <header className="page-head page-head-stack">
            <p className="eyebrow">Timed paper</p>
            <h1 className="page-title">Set the paper before the clock</h1>
            <p className="page-note">
              English is compulsory. Pick one to three other subjects (two to four in total). Questions are drawn
              at random, and nothing is revealed until you end the paper or time runs out.
            </p>
          </header>

          <div className="card setup">
            <fieldset className="fieldset">
              <legend className="legend">Subjects</legend>
              <div className="chips">
                {SUBJECTS.map((subject) => {
                  const available = questions.filter((question) => question.subject === subject.id).length;
                  const active = subjectIds.includes(subject.id);
                  const locked = subject.id === 'english';
                  const blocked = available === 0 || (locked && available > 0) || (!active && atSubjectLimit);
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      className={`chip ${active ? 'is-active' : ''} ${locked && available > 0 ? 'is-locked' : ''}`}
                      aria-pressed={active}
                      aria-disabled={locked || undefined}
                      disabled={blocked}
                      onClick={() => toggleSubject(subject.id)}
                    >
                      {subject.short}
                      {locked ? <span className="chip-lock">Required</span> : null}
                    </button>
                  );
                })}
              </div>
              {subjectIds.length < MIN_SUBJECTS ? (
                <p className="hint hint-warn">
                  English is compulsory — pick at least one more subject. Minimum is two subjects.
                </p>
              ) : null}
              {atSubjectLimit ? (
                <p className="hint">Maximum of four subjects including English. Untick one to swap.</p>
              ) : null}
              {englishAvailable === 0 ? (
                <p className="hint hint-bad">No English questions are loaded. Import the English paper before starting.</p>
              ) : null}
            </fieldset>

            <fieldset className="fieldset">
              <legend className="legend">Questions</legend>
              <div className="segmented">
                {COUNT_CHOICES.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    className={`segment ${count === choice ? 'is-active' : ''}`}
                    aria-pressed={count === choice}
                    onClick={() => setCount(choice)}
                  >
                    {choice}
                  </button>
                ))}
              </div>
              <p className="hint">
                {pool.length === 0
                  ? 'No questions in the selected subjects yet.'
                  : `This paper will have ${plural(paperSize, 'question')}.`}
              </p>
            </fieldset>

            <fieldset className="fieldset">
              <legend className="legend">Time limit</legend>
              <div className="duration-field">
                <input
                  id="exam-minutes"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={minutesDraft}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, '').slice(0, 3);
                    setMinutesDraft(digits === '' ? '' : String(Math.min(MAX_MINUTES, Number(digits))));
                  }}
                  onBlur={() => setMinutesDraft(String(minutes))}
                  aria-describedby="exam-minutes-hint"
                />
                <span className="duration-unit">minutes</span>
                <span className="duration-max">max {MAX_MINUTES}</span>
              </div>
              <p className="hint" id="exam-minutes-hint">
                Set any duration up to two hours.{' '}
                {paperSize > 0 ? `${Math.round((minutes * 60) / paperSize)} seconds per question.` : '—'}
              </p>
            </fieldset>

            <div className="setup-foot">
              <button type="button" className="btn btn-primary" onClick={start} disabled={!canStart}>
                Start the clock
              </button>
              <p className="setup-meta">
                {plural(subjectIds.length, 'subject')} · {plural(paperSize, 'question')} · {minutes} minutes
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ── Results ───────────────────────────────────────────────────────── */
  if (phase === 'done' && outcome) {
    const breakdown = Object.entries(outcome.bySubject).filter(([, value]) => value && value.total > 0);

    return (
      <section className="section">
        <div className="wrap">
          <header className="page-head page-head-stack">
            <p className="eyebrow">{outcome.timedOut ? 'Time ran out' : 'Exam ended'}</p>
            <h1 className="page-title">Result</h1>
          </header>

          <div className="score-board card">
            <p className="score-figure">
              {outcome.correct}
              <span className="score-of">/ {outcome.total}</span>
            </p>
            <div className="score-meta">
              <p className="score-percent">{percent(outcome.correct, outcome.total)}%</p>
              <p className="score-detail">
                Time used {formatClock(outcome.usedSec)} of {formatClock(outcome.durationSec)} · {answeredCount} of{' '}
                {outcome.total} answered
              </p>
              <div className="score-bar" aria-hidden="true">
                <span style={{ width: `${percent(outcome.correct, outcome.total)}%` }} />
              </div>
            </div>
            <div className="score-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={start}>
                Retake this mix
              </button>
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                onClick={() => {
                  setPhase('setup');
                  setOutcome(null);
                }}
              >
                New paper
              </button>
            </div>
          </div>

          <h2 className="subhead">By subject</h2>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Subject</th>
                <th scope="col">Score</th>
                <th scope="col">Percent</th>
                <th scope="col" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {breakdown.map(([id, value]) => {
                const share = percent(value!.correct, value!.total);
                return (
                  <tr key={id}>
                    <th scope="row">{subjectById(id as SubjectId).name}</th>
                    <td className="num">
                      {value!.correct}/{value!.total}
                    </td>
                    <td className="num">{share}%</td>
                    <td className="bar-cell">
                      <span className="bar">
                        <span style={{ width: `${share}%` }} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h2 className="subhead">Every question, explained</h2>
          <ol className="review" role="list">
            {paper.map((question, position) => {
              const given = answers[question.id] ?? null;
              const ok = given === question.answer;
              return (
                <li key={question.id}>
                  <details className="review-item" open={!ok && position < 2}>
                    <summary className="review-summary">
                      <span className={`review-mark ${ok ? 'is-ok' : 'is-no'}`}>{ok ? '✓' : '✗'}</span>
                      <span className="review-count">{position + 1}</span>
                      <span className="review-topic">{subjectById(question.subject).short}</span>
                      <span className="review-given">
                        {given ? `you: ${given}` : 'left blank'} · key: {question.answer}
                      </span>
                    </summary>
                    <div className="review-body">
                      <p className="question-prompt">
                        <RichText text={question.prompt} />
                      </p>
                      <OptionList question={question} selected={given} revealed onSelect={() => undefined} />
                      <div className="verdict is-neutral">
                        <p className="verdict-head">Why {question.answer} is right</p>
                        <p className="verdict-body">{question.explanation}</p>
                      </div>
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    );
  }

  /* ── Running ───────────────────────────────────────────────────────── */
  if (!current) {
    return (
      <section className="section">
        <div className="wrap">
          <p className="empty">This paper is empty. Go back and pick a subject with questions.</p>
          <button type="button" className="btn btn-outline" onClick={() => setPhase('setup')}>
            Back to setup
          </button>
        </div>
      </section>
    );
  }

  const lowTime = remaining <= 60;
  const isFlagged = flags.includes(current.id);

  return (
    <section className="section section-exam">
      <div className="exam-bar">
        <div className="wrap exam-bar-inner">
          <p className={`clock ${lowTime ? 'is-low' : ''}`} aria-live="off">
            <span className="clock-label">Time left</span>
            <span className="clock-value">{formatClock(remaining)}</span>
          </p>
          <p className="exam-progress">
            {answeredCount} of {paper.length} answered
          </p>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setConfirmOpen(true)}>
            End exam
          </button>
        </div>
        <div className="wrap">
          <span className="exam-bar-track" aria-hidden="true">
            <span style={{ width: `${percent(index + 1, paper.length)}%` }} />
          </span>
        </div>
      </div>

      <div className="wrap exam-grid">
        <article className="card question-card">
          <div className="question-meta">
            <span className="pill">Question {index + 1}</span>
            <span className="pill pill-quiet">{subjectById(current.subject).short}</span>
          </div>

          <p className="question-prompt">
            <RichText text={current.prompt} />
          </p>

          <OptionList question={current} selected={answers[current.id] ?? null} onSelect={choose} />

          <div className="question-actions">
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}>
              ← Previous
            </button>
            <button
              type="button"
              className={`btn btn-outline btn-sm ${isFlagged ? 'is-flagged' : ''}`}
              aria-pressed={isFlagged}
              onClick={() =>
                setFlags((value) => (value.includes(current.id) ? value.filter((id) => id !== current.id) : [...value, current.id]))
              }
            >
              {isFlagged ? 'Flagged' : 'Flag for review'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIndex((value) => Math.min(paper.length - 1, value + 1))}
              disabled={index === paper.length - 1}
            >
              Next →
            </button>
          </div>
        </article>

        <aside className="palette">
          <h2 className="side-title">Palette</h2>
          <ol className="palette-grid" role="list">
            {paper.map((question, position) => {
              const classes = ['palette-cell'];
              if (answers[question.id]) classes.push('is-answered');
              if (flags.includes(question.id)) classes.push('is-flagged');
              if (position === index) classes.push('is-current');
              return (
                <li key={question.id}>
                  <button type="button" className={classes.join(' ')} onClick={() => setIndex(position)}>
                    {position + 1}
                  </button>
                </li>
              );
            })}
          </ol>
          <ul className="legend-list" role="list">
            <li>
              <span className="swatch swatch-answered" aria-hidden="true" /> answered
            </li>
            <li>
              <span className="swatch swatch-flagged" aria-hidden="true" /> flagged
            </li>
            <li>
              <span className="swatch swatch-empty" aria-hidden="true" /> untouched
            </li>
          </ul>
        </aside>
      </div>

      <Modal
        open={confirmOpen}
        title="End this exam?"
        confirmLabel="End exam"
        onConfirm={() => finish(false)}
        onClose={() => setConfirmOpen(false)}
      >
        <p>
          {paper.length - answeredCount === 0
            ? 'Every question has an answer. You will see your score and the explanations next.'
            : `${plural(paper.length - answeredCount, 'question')} left unanswered. Blank answers score zero. You will see your score next.`}
        </p>
      </Modal>
    </section>
  );
}
