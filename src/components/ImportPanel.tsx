import { useRef, useState } from 'react';
import { parseQuestions } from '../lib/importQuestions';
import type { Question } from '../lib/types';
import { plural } from '../lib/utils';

interface ImportPanelProps {
  bankSize: number;
  importedCount: number;
  onImport: (questions: Question[]) => void;
  onClearImported: () => void;
}

const TEMPLATE = `{
  "questions": [
    {
      "id": "mat-101",
      "subject": "mathematics",
      "topic": "Percentages",
      "prompt": "A trader buys a bag of rice for ₦40,000 and sells it for ₦46,000. Find the percentage profit.",
      "options": {
        "A": "6%",
        "B": "13%",
        "C": "15%",
        "D": "60%"
      },
      "answer": "C",
      "explanation": "Profit = 46,000 − 40,000 = ₦6,000. Percentage profit = (6,000 / 40,000) × 100 = 15%.",
      "source": "My own notes",
      "year": 2024
    }
  ]
}`;

export function ImportPanel({ bankSize, importedCount, onImport, onClearImported }: ImportPanelProps) {
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const runImport = () => {
    const { questions, errors: problems } = parseQuestions(text);
    setErrors(problems);
    if (problems.length > 0 || questions.length === 0) {
      setMessage(null);
      return;
    }
    onImport(questions);
    setMessage(`${plural(questions.length, 'question')} imported.`);
    setText('');
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <section className="section">
      <div className="wrap wrap-narrow">
        <header className="page-head page-head-stack">
          <p className="eyebrow">Import</p>
          <h1 className="page-title">Bring your own questions</h1>
          <p className="page-note">
            The seed bank holds {plural(bankSize - importedCount, 'original practice item')}. Paste or upload a JSON file
            of your own material — notes, a licensed pack, a class set — and it joins the same bank, practice filters
            and timed papers.
          </p>
        </header>

        <div className="card setup">
          <div className="fieldset">
            <label className="legend" htmlFor="import-text">
              Questions as JSON
            </label>
            <textarea
              id="import-text"
              className="code-input"
              value={text}
              spellCheck={false}
              rows={12}
              placeholder='{ "questions": [ { "subject": "biology", "prompt": "…", "options": {…}, "answer": "B", "explanation": "…" } ] }'
              onChange={(event) => setText(event.target.value)}
            />
            <div className="import-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={runImport} disabled={!text.trim()}>
                Import questions
              </button>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setText(TEMPLATE)}>
                Load an example
              </button>
              <label className="btn btn-outline btn-sm file-btn">
                Choose a .json file
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/json,.json"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setText(await file.text());
                    setMessage(null);
                    setErrors([]);
                  }}
                />
              </label>
            </div>
          </div>

          {message ? (
            <p className="hint hint-ok" role="status">
              {message}
            </p>
          ) : null}

          {errors.length > 0 ? (
            <div className="hint hint-bad">
              <p>Nothing was imported. Fix these first:</p>
              <ul>
                {errors.slice(0, 8).map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
              {errors.length > 8 ? <p>{plural(errors.length - 8, 'other problem')} also reported.</p> : null}
            </div>
          ) : null}

          <div className="import-foot">
            <p className="hint">
              Imported questions currently stored on this device: <strong>{importedCount}</strong>.
            </p>
            <button type="button" className="btn btn-quiet btn-sm" onClick={onClearImported} disabled={importedCount === 0}>
              Remove imported questions
            </button>
          </div>
        </div>

        <h2 className="subhead">The schema</h2>
        <ul className="schema" role="list">
          <li>
            <code>subject</code> — one of: english, mathematics, physics, chemistry, biology, government, economics,
            literature.
          </li>
          <li>
            <code>prompt</code> — the question text.
          </li>
          <li>
            <code>options</code> — an object with the keys <code>A</code>, <code>B</code>, <code>C</code>, <code>D</code>.
          </li>
          <li>
            <code>answer</code> — one of A, B, C, D.
          </li>
          <li>
            <code>explanation</code> — shown in practice mode and in the review after a paper.
          </li>
          <li>
            <code>topic</code>, <code>id</code>, <code>source</code>, <code>year</code> — optional. Ids are generated if
            you leave them out.
          </li>
        </ul>

        <p className="hint hint-warn">
          Import only material you have the right to use. Transcribing a publisher&rsquo;s question bank into this app is
          not covered by its licence.
        </p>
      </div>
    </section>
  );
}
