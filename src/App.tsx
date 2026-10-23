import { useCallback, useEffect, useMemo, useState } from 'react';
import { Footer } from './components/Footer';
import { Exam } from './components/Exam';
import { Home } from './components/Home';
import { ImportPanel } from './components/ImportPanel';
import { Practice } from './components/Practice';
import { Progress } from './components/Progress';
import { TopBar } from './components/TopBar';
import { SEED_QUESTIONS } from './data/questions';
import { mergeQuestions } from './lib/importQuestions';
import { store } from './lib/storage';
import type { Question, SessionRecord, SubjectId, View } from './lib/types';

const VIEWS: View[] = ['home', 'practice', 'exam', 'progress', 'import'];

function viewFromHash(): View {
  if (typeof window === 'undefined') return 'home';
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return (VIEWS as string[]).includes(raw) ? (raw as View) : 'home';
}

export default function App() {
  const [view, setView] = useState<View>(viewFromHash);
  const [custom, setCustom] = useState<Question[]>(() => store.questions.load());
  const [sessions, setSessions] = useState<SessionRecord[]>(() => store.sessions.load());
  const [filter, setFilter] = useState<SubjectId | 'all'>(() => store.filters.load());

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [view]);

  const questions = useMemo(() => mergeQuestions(SEED_QUESTIONS, custom), [custom]);

  const go = useCallback((next: View) => {
    const hash = next === 'home' ? '#/' : `#/${next}`;
    if (window.location.hash === hash || (next === 'home' && window.location.hash === '')) {
      setView(next);
      window.scrollTo({ top: 0 });
      return;
    }
    window.location.hash = hash;
  }, []);

  const pickSubject = useCallback(
    (id: SubjectId | 'all') => {
      setFilter(id);
      store.filters.save(id);
      go('practice');
    },
    [go],
  );

  const addSession = useCallback((record: SessionRecord) => {
    setSessions((previous) => {
      const next = [record, ...previous].slice(0, 80);
      store.sessions.save(next);
      return next;
    });
  }, []);

  const importQuestions = useCallback((incoming: Question[]) => {
    setCustom((previous) => {
      const next = mergeQuestions(previous, incoming);
      store.questions.save(next);
      return next;
    });
  }, []);

  const clearImported = useCallback(() => {
    setCustom([]);
    store.questions.save([]);
  }, []);

  const clearAll = useCallback(() => {
    store.clearUserData();
    setCustom([]);
    setSessions([]);
    setFilter('all');
  }, []);

  return (
    <div className="app">
      <TopBar view={view} onNavigate={go} />

      <main id="main" className="main">
        {view === 'home' ? (
          <Home
            questions={questions}
            sessions={sessions}
            onPickSubject={pickSubject}
            onStartExam={() => go('exam')}
            onOpenProgress={() => go('progress')}
          />
        ) : null}

        {view === 'practice' ? <Practice questions={questions} filter={filter} onFilter={pickSubject} /> : null}

        {view === 'exam' ? <Exam questions={questions} onSession={addSession} /> : null}

        {view === 'progress' ? (
          <Progress sessions={sessions} onClear={clearAll} onStartExam={() => go('exam')} />
        ) : null}

        {view === 'import' ? (
          <ImportPanel
            questions={questions}
            importedCount={custom.length}
            onImport={importQuestions}
            onClearImported={clearImported}
          />
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
