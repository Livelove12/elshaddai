import { useMemo } from 'react';
import { SUBJECTS, subjectById } from '../data/subjects';
import type { Question, SessionRecord, SubjectId } from '../lib/types';
import { formatDate, percent } from '../lib/utils';
import { OptionList } from './OptionList';
import { RichText } from './RichText';

interface HomeProps {
  questions: Question[];
  sessions: SessionRecord[];
  onPickSubject: (subject: SubjectId | 'all') => void;
  onStartExam: () => void;
  onOpenProgress: () => void;
}

export function Home({ questions, sessions, onPickSubject, onStartExam, onOpenProgress }: HomeProps) {
  const counts = useMemo(() => {
    const map = new Map<SubjectId, number>();
    for (const question of questions) map.set(question.subject, (map.get(question.subject) ?? 0) + 1);
    return map;
  }, [questions]);

  const sample = questions.find((question) => question.subject === 'english') ?? questions[0];
  const lastSession = sessions[0];

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">JAMB · UTME practice</p>
            <h1 className="hero-title">Sit the exam before the exam.</h1>
            <p className="lede">
              A quiet room with a running clock. Work the bank topic by topic, or take a timed paper with no
              explanations until you end it — then read why every answer is right.
            </p>
            <div className="hero-actions">
              <button type="button" className="btn btn-primary" onClick={onStartExam}>
                Set up a timed paper
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => onPickSubject('all')}>
                Open the question bank
              </button>
            </div>
            <p className="hero-note">Full question bank · works offline</p>
          </div>

          {sample ? (
            <figure className="hero-panel">
              <figcaption className="panel-caption">
                <span className="panel-tag">Sample</span>
                {subjectById(sample.subject).short}
              </figcaption>
              <p className="panel-prompt">
                <RichText text={sample.prompt} />
              </p>
              <OptionList question={sample} selected={sample.answer} revealed onSelect={() => undefined} />
              <p className="panel-note">
                Every item carries a written explanation. Reveal it whenever you like in practice mode.
              </p>
            </figure>
          ) : null}
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <h2>Where the marks are</h2>
            <p className="section-note">Pick a subject to open it in practice mode.</p>
          </div>

          <ul className="subject-grid" role="list">
            {SUBJECTS.map((subject) => {
              const count = counts.get(subject.id) ?? 0;
              return (
                <li key={subject.id}>
                  <button
                    type="button"
                    className="subject-card"
                    onClick={() => onPickSubject(subject.id)}
                    disabled={count === 0}
                  >
                    <span className="subject-name">{subject.name}</span>
                    <span className="subject-blurb">{subject.blurb}</span>
                    <span className="subject-foot">
                      <span className="subject-count">Practice</span>
                      <span className="subject-arrow" aria-hidden="true">
                        →
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="section section-tint">
        <div className="wrap">
          <div className="section-head">
            <h2>Two ways to work</h2>
            <p className="section-note">Same bank, different pressure. Use both.</p>
          </div>

          <div className="mode-grid">
            <article className="mode">
              <p className="mode-kicker">Untimed</p>
              <h3>Practice by topic</h3>
              <p>
                Choose an answer, then reveal the explanation. Filter to a subject or search the prompts. Nothing is
                recorded against you; the clock never runs.
              </p>
              <ul className="mode-list">
                <li>Explanations on demand</li>
                <li>Keyboard: A–D to answer, arrows to move</li>
                <li>A running tally for the sitting</li>
              </ul>
              <button type="button" className="btn btn-outline" onClick={() => onPickSubject('all')}>
                Open the bank
              </button>
            </article>

            <article className="mode">
              <p className="mode-kicker">Timed</p>
              <h3>Papers under a clock</h3>
              <p>
                English is compulsory; add one to three other subjects and set your own time, up to two hours. Answers
                stay hidden until you end the exam, but you can flag a question and come back to it.
              </p>
              <ul className="mode-list">
                <li>Question palette with flagged items</li>
                <li>Ends automatically when time runs out</li>
                <li>Score breakdown by subject afterward</li>
              </ul>
              <button type="button" className="btn btn-outline" onClick={onStartExam}>
                Set up a paper
              </button>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head section-head-row">
            <h2>Your last sittings</h2>
            {sessions.length > 0 ? (
              <button type="button" className="link-btn" onClick={onOpenProgress}>
                All results →
              </button>
            ) : null}
          </div>

          {lastSession ? (
            <ol className="recent" role="list">
              {sessions.slice(0, 4).map((session) => (
                <li key={session.id} className="recent-row">
                  <span className="recent-date">{formatDate(session.createdAt)}</span>
                  <span className="recent-subjects">
                    {session.subjectIds.length > 2
                      ? `${session.subjectIds.length} subjects`
                      : session.subjectIds.map((id) => subjectById(id).short).join(', ')}
                  </span>
                  <span className="recent-score">
                    {session.correct}/{session.total}
                  </span>
                  <span className="recent-percent">{percent(session.correct, session.total)}%</span>
                  <span className="recent-bar" aria-hidden="true">
                    <span style={{ width: `${percent(session.correct, session.total)}%` }} />
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty">
              No papers yet. Your first timed sitting will appear here, with a breakdown by subject.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
