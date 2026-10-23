import { useMemo, useState } from 'react';
import { SUBJECTS, subjectById } from '../data/subjects';
import type { SessionRecord, SubjectId } from '../lib/types';
import { formatClock, formatDate, percent } from '../lib/utils';
import { Modal } from './Modal';

interface ProgressProps {
  sessions: SessionRecord[];
  onClear: () => void;
  onStartExam: () => void;
}

export function Progress({ sessions, onClear, onStartExam }: ProgressProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const totals = useMemo(() => {
    const answered = sessions.reduce((sum, session) => sum + session.total, 0);
    const correct = sessions.reduce((sum, session) => sum + session.correct, 0);
    const best = sessions.reduce((max, session) => Math.max(max, percent(session.correct, session.total)), 0);
    const time = sessions.reduce((sum, session) => sum + session.usedSec, 0);
    return { answered, correct, best, time };
  }, [sessions]);

  const perSubject = useMemo(() => {
    const map = new Map<SubjectId, { total: number; correct: number }>();
    for (const session of sessions) {
      for (const [id, value] of Object.entries(session.bySubject)) {
        if (!value) continue;
        const bucket = map.get(id as SubjectId) ?? { total: 0, correct: 0 };
        bucket.total += value.total;
        bucket.correct += value.correct;
        map.set(id as SubjectId, bucket);
      }
    }
    return map;
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <section className="section">
        <div className="wrap wrap-narrow">
          <header className="page-head page-head-stack">
            <p className="eyebrow">Progress</p>
            <h1 className="page-title">Nothing recorded yet</h1>
            <p className="page-note">
              Papers you sit are stored in this browser — never uploaded. Finish one and this page fills with your
              scores by subject.
            </p>
          </header>
          <button type="button" className="btn btn-primary" onClick={onStartExam}>
            Set up a paper
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="wrap">
        <header className="page-head">
          <div>
            <p className="eyebrow">Progress</p>
            <h1 className="page-title">What the clock says about you</h1>
          </div>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setConfirmOpen(true)}>
            Clear all data
          </button>
        </header>

        <div className="tiles">
          <div className="tile">
            <p className="tile-label">Papers sat</p>
            <p className="tile-value">{sessions.length}</p>
          </div>
          <div className="tile">
            <p className="tile-label">Questions answered</p>
            <p className="tile-value">{totals.answered}</p>
          </div>
          <div className="tile">
            <p className="tile-label">Overall accuracy</p>
            <p className="tile-value">{percent(totals.correct, totals.answered)}%</p>
          </div>
          <div className="tile">
            <p className="tile-label">Best paper</p>
            <p className="tile-value">{totals.best}%</p>
          </div>
          <div className="tile">
            <p className="tile-label">Time under the clock</p>
            <p className="tile-value">{formatClock(totals.time)}</p>
          </div>
        </div>

        <h2 className="subhead">Accuracy by subject</h2>
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Subject</th>
              <th scope="col">Correct</th>
              <th scope="col">Seen</th>
              <th scope="col">Percent</th>
              <th scope="col" aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {SUBJECTS.map((subject) => {
              const bucket = perSubject.get(subject.id);
              const share = bucket ? percent(bucket.correct, bucket.total) : 0;
              return (
                <tr key={subject.id} className={bucket ? '' : 'is-muted'}>
                  <th scope="row">{subject.name}</th>
                  <td className="num">{bucket ? bucket.correct : '—'}</td>
                  <td className="num">{bucket ? bucket.total : '—'}</td>
                  <td className="num">{bucket ? `${share}%` : '—'}</td>
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

        <h2 className="subhead">Paper log</h2>
        <ul className="log" role="list">
          {sessions.map((session) => (
            <li key={session.id} className="log-row">
              <span className="log-date">{formatDate(session.createdAt)}</span>
              <span className="log-subjects">
                {session.subjectIds.length > 2
                  ? `${session.subjectIds.length} subjects`
                  : session.subjectIds.map((id) => subjectById(id).short).join(', ')}
              </span>
              <span className="log-score">
                {session.correct}/{session.total} · {percent(session.correct, session.total)}%
              </span>
              <span className="log-time">
                {formatClock(session.usedSec)} of {formatClock(session.durationSec)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Modal
        open={confirmOpen}
        title="Clear everything on this device?"
        confirmLabel="Delete it all"
        destructive
        onConfirm={onClear}
        onClose={() => setConfirmOpen(false)}
      >
        <p>
          Your imported questions, paper log and accuracy figures will be removed from this browser. This cannot be
          undone.
        </p>
      </Modal>
    </section>
  );
}
