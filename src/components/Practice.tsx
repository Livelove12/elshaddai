import { useCallback, useEffect, useMemo, useState } from 'react';
import { subjectById, SUBJECTS } from '../data/subjects';
import { OPTION_KEYS, type OptionKey, type Question, type SubjectId } from '../lib/types';
import { percent } from '../lib/utils';
import { OptionList } from './OptionList';
import { RichText } from './RichText';

interface PracticeProps {
  questions: Question[];
  filter: SubjectId | 'all';
  onFilter: (filter: SubjectId | 'all') => void;
}

export function Practice({ questions, filter, onFilter }: PracticeProps) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<OptionKey | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ attempted: 0, correct: 0 });

  const counts = useMemo(() => {
    const map = new Map<SubjectId, number>();
    for (const question of questions) map.set(question.subject, (map.get(question.subject) ?? 0) + 1);
    return map;
  }, [questions]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return questions.filter((question) => {
      if (filter !== 'all' && question.subject !== filter) return false;
      if (!needle) return true;
      return (
        question.prompt.toLowerCase().includes(needle) ||
        question.topic.toLowerCase().includes(needle) ||
        subjectById(question.subject).name.toLowerCase().includes(needle)
      );
    });
  }, [questions, filter, query]);

  // Reset the card whenever the working set changes underneath it.
  useEffect(() => {
    setIndex(0);
  }, [filter, query]);

  const current = filtered[index];

  useEffect(() => {
    setSelected(null);
    setRevealed(false);
  }, [index, filter, query]);

  const reset = useCallback(() => {
    setSelected(null);
    setRevealed(false);
  }, []);

  const move = useCallback(
    (delta: number) => {
      if (filtered.length === 0) return;
      setIndex((value) => (value + delta + filtered.length) % filtered.length);
    },
    [filtered.length],
  );

  const choose = useCallback(
    (key: OptionKey) => {
      setSelected(key);
      if (!current) return;
      setTally((value) => ({
        attempted: value.attempted + 1,
        correct: value.correct + (key === current.answer ? 1 : 0),
      }));
      setRevealed(true);
    },
    [current],
  );

  // Keyboard shortcuts: A–D / 1–4 to answer, J/K or arrows to move.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toUpperCase();
      const byLetter = OPTION_KEYS.find((option) => option === key);
      const byNumber = /^[1-4]$/.test(key) ? OPTION_KEYS[Number(key) - 1] : undefined;
      const pick = byLetter ?? byNumber;

      if (pick && !revealed && current) {
        event.preventDefault();
        choose(pick);
        return;
      }
      if (key === 'ARROWRIGHT' || key === 'K') {
        event.preventDefault();
        move(1);
      }
      if (key === 'ARROWRLEFT' || key === 'J') {
        event.preventDefault();
        move(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, current, move, revealed]);

  const accuracy = tally.attempted > 0 ? percent(tally.correct, tally.attempted) : 0;

  return (
    <section className="section">
      <div className="wrap">
        <header className="page-head">
          <div>
            <p className="eyebrow">Question bank</p>
            <h1 className="page-title">Practice by topic</h1>
          </div>
          <p className="page-note">
            {tally.attempted > 0 ? (
              <>
                This sitting: <strong>{tally.correct}/{tally.attempted}</strong> correct ({accuracy}%)
              </>
            ) : (
              'Answer with A–D or 1–4. The explanation appears as soon as you choose.'
            )}
          </p>
        </header>

        <div className="filterbar">
          <div className="chips" role="group" aria-label="Filter by subject">
            <button
              type="button"
              className={`chip ${filter === 'all' ? 'is-active' : ''}`}
              aria-pressed={filter === 'all'}
              onClick={() => onFilter('all')}
            >
              All
            </button>
            {SUBJECTS.map((subject) => (
              <button
                key={subject.id}
                type="button"
                className={`chip ${filter === subject.id ? 'is-active' : ''}`}
                aria-pressed={filter === subject.id}
                onClick={() => onFilter(subject.id)}
                disabled={(counts.get(subject.id) ?? 0) === 0}
              >
                {subject.short}
              </button>
            ))}
          </div>

          <label className="search">
            <span className="visually-hidden">Search questions</span>
            <input
              type="search"
              value={query}
              placeholder="Search questions"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        {current ? (
          <div className="reader">
            <div className="reader-main">
              <article className="card question-card">
                <div className="question-meta">
                  <span className="pill">{subjectById(current.subject).short}</span>
                  <span className="pill pill-quiet">{current.topic}</span>
                  {current.source ? <span className="question-source">{current.source}</span> : null}
                </div>

                <p className="question-prompt">
                  <RichText text={current.prompt} />
                </p>

                <OptionList
                  question={current}
                  selected={selected}
                  revealed={revealed}
                  onSelect={choose}
                />

                {revealed ? (
                  <div className={`verdict ${selected === current.answer ? 'is-ok' : 'is-no'}`}>
                    <p className="verdict-head">
                      {selected === current.answer ? 'Correct.' : `Not quite — the answer is ${current.answer}.`}
                    </p>
                    <p className="verdict-body">{current.explanation}</p>
                  </div>
                ) : null}

                <div className="question-actions">
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => move(-1)}>
                    ← Previous
                  </button>
                  {!revealed ? (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setRevealed(true);
                        setSelected(null);
                      }}
                    >
                      Show answer
                    </button>
                  ) : (
                    <button type="button" className="btn btn-outline btn-sm" onClick={reset}>
                      Try again
                    </button>
                  )}
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => move(1)}>
                    Next →
                  </button>
                </div>
              </article>
            </div>

            <aside className="reader-side">
              <div className="side-card">
                <h2 className="side-title">Current question</h2>
                <p className="side-big">Question {index + 1}</p>
                <p className="side-note">Use Previous and Next to move through the set.</p>
              </div>

              <div className="side-card side-card-quiet">
                <h2 className="side-title">Keys</h2>
                <dl className="keys">
                  <div>
                    <dt>A – D</dt>
                    <dd>choose an option</dd>
                  </div>
                  <div>
                    <dt>← →</dt>
                    <dd>move between questions</dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        ) : (
          <p className="empty">
            Nothing matches that filter. Clear the search box or pick another subject.
          </p>
        )}
      </div>
    </section>
  );
}
