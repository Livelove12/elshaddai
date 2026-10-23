import type { View } from '../lib/types';

const NAV: { view: Exclude<View, 'home'>; label: string; short: string }[] = [
  { view: 'practice', label: 'Practice', short: 'Practice' },
  { view: 'exam', label: 'Timed paper', short: 'Paper' },
  { view: 'progress', label: 'Progress', short: 'Progress' },
  { view: 'import', label: 'Import', short: 'Import' },
];

interface TopBarProps {
  view: View;
  onNavigate: (view: View) => void;
}

export function TopBar({ view, onNavigate }: TopBarProps) {
  const link = (item: (typeof NAV)[number], extraClass = '') => (
    <a
      key={item.view}
      href={`#/${item.view}`}
      className={`${extraClass} ${view === item.view ? 'is-active' : ''}`.trim()}
      aria-current={view === item.view ? 'page' : undefined}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(item.view);
      }}
    >
      {extraClass === 'tab' ? item.short : item.label}
    </a>
  );

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="topbar">
        <div className="topbar-inner">
          <a
            className="brand"
            href="#/"
            onClick={(event) => {
              event.preventDefault();
              onNavigate('home');
            }}
          >
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-word">Elshaddai</span>
            <span className="brand-sub">JAMB CBT</span>
          </a>

          <nav className="topnav" aria-label="Primary">
            {NAV.map((item) => link(item))}
            <button
              type="button"
              className="btn btn-primary btn-sm topnav-cta"
              onClick={() => onNavigate('exam')}
            >
              Sit a paper
            </button>
          </nav>

          <p className="topbar-meta">
            <span className="meta-dot" aria-hidden="true" />
            Private bank on this device
          </p>
        </div>
      </header>

      <nav className="tabbar" aria-label="Primary">
        {NAV.map((item) => link(item, 'tab'))}
      </nav>
    </>
  );
}
