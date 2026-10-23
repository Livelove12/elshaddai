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
const MINUTE_CHOICES = [10, 20, 30, 45];

interface ExamProps {
  questions: Question[];
  onSession: (session: SessionRecord) => void;
}

export function Exam({ questions, onSession }: ExamProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [subjectIds, setSubjectIds] = useState<SubjectId[]>(() => SUBJECTS.map((subject) => subject.id));
  const [count, setCount] = useState(20);
  const [minutes, setMinutes] = useState(20);

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
  const current = paper[index];
  const answeredCount = paper.reduce((total, question) => total + (answers[question.id] ? 1 : 0), 0);

  const start = useCallback(() => {
    if (pool.length === 0) return;
    finished.current = false;
    setPaper(shuffle(pool).slice(0, Math.min(count, pool.length)));
    setAnswers({});
    setFlags([]);
    setIndex(0);
    setOutcome(null);
    setRemaining(minutes * 60);
    setDeadline(Date.now() + minutes * 60 * 1000);
    setPhase('running');
  }, [count, minutes, pool]);

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
    setSubjectIds((value) => (value.includes(id) ? value.filter((item) => item !== id) : [...value, id]));
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
              Questions are drawn at random from the subjects you tick. Nothing is revealed until you submit.
            </p>
          </header>

          <div className="card setup">
            <fieldset className="fieldset">
              <legend className="legend">Subjects</legend>
              <div className="chips">
                {SUBJECTS.map((subject) => {
                  const available = questions.filter((question) => question.subject === subject.id).length;
                  const active = subjectIds.includes(subject.id);
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      className={`chip ${active ? 'is-active' : ''}`}
                      aria-pressed={active}
                      disabled={available === 0}
                      onClick={() => toggleSubject(subject.id)}
                    >
                      {subject.short} <span className="chip-count">{available}</span>
                    </button>
                  );
                })}
              </div>
              {subjectIds.length === 0 ? <p className="hint hint-warn">Tick at least one subject.</p> : null}
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
                  : `This paper will have ${plural(paperSize, 'question')} — the pool holds ${pool.length}.`}
              </p>
            </fieldset>

            <fieldset className="fieldset">
              <legend className="legend">Minutes</legend>
              <div className="segmented">
                {MINUTE_CHOICES.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    className={`segment ${minutes === choice ? 'is-active' : ''}`}
                    aria-pressed={minutes === choice}
                    onClick={() => setMinutes(choice)}
                  >
                    {choice}
                  </button>
                ))}
              </div>
              <p className="hint">
                {paperSize > 0 ? `${Math.round((minutes * 60) / paperSize)} seconds per question.` : '—'}
              </p>
            </fieldset>

            <div className="setup-foot">
              <button type="button" className="btn btn-primary" onClick={start} disabled={pool.length === 0}>
                Start the clock
              </button>
              <p className="setup-meta">
                {subjectIds.length} of {SUBJECTS.length} subjects · {plural(paperSize, 'question')} · {minutes} minutes
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
            <p className="eyebrow">{outcome.timedOut ? 'Time ran out' : 'Submitted'}</p>
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
                      <span className="review-topic">
                        {subjectById(question.subject).short} · {question.topic}
                      </span>
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
            Submit paper
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
            <span className="pill pill-quiet">{current.topic}</span>
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
        title="Submit this paper?"
        confirmLabel="Submit"
        onConfirm={() => finish(false)}
        onClose={() => setConfirmOpen(false)}
      >
        <p>
          {paper.length - answeredCount === 0
            ? 'Every question has an answer.'
            : `${plural(paper.length - answeredCount, 'question')} left unanswered. Blank answers score zero.`}
        </p>
      </Modal>
    </section>
  );
}
