import {
  Calculator,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Map as MapIcon,
  Menu,
  RotateCcw,
  Scale,
  Search,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { href, navigate } from '../state/router';
import { useStore } from '../state/store';
import { ConfirmDialog, Segmented, cx } from './ui';

export const NAV = [
  { to: '/map', label: 'Map', icon: MapIcon },
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/find', label: 'Matches', icon: Search },
  { to: '/compare', label: 'Compare', icon: Scale },
  { to: '/cost', label: 'Costs', icon: Calculator },
  { to: '/insurance', label: 'Insurance', icon: FileText },
  { to: '/plan', label: 'Visit plan', icon: ClipboardList },
  { to: '/profile', label: 'My profile', icon: User },
] as const;

export function Logo({ onDark }: { onDark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#22c55e" />
        <path d="M9 17.5a7 7 0 0 1 12.2-4.7" fill="none" stroke="#03140a" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M23 14.5a7 7 0 0 1-12.2 4.7" fill="none" stroke="#0b5a2e" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="16" cy="16" r="2.3" fill="#03140a" />
      </svg>
      <span className={cx('text-[1.2rem] font-extrabold tracking-tight', onDark ? 'text-white' : 'text-white')}>CareCost</span>
    </span>
  );
}

function DisplaySettings() {
  const { settings, setSettings } = useStore();
  return (
    <div className="space-y-3">
      <Segmented
        legend="Text size"
        size="sm"
        value={settings.textSize}
        onChange={(v) => setSettings({ textSize: v })}
        options={[
          { value: 'base', label: 'A' },
          { value: 'lg', label: 'A+' },
          { value: 'xl', label: 'A++' },
        ]}
      />
      <label className="flex min-h-[40px] cursor-pointer items-center gap-2.5 text-sm font-semibold">
        <input
          type="checkbox"
          className="h-5 w-5 accent-pine-700"
          checked={settings.reduceMotion}
          onChange={(e) => setSettings({ reduceMotion: e.target.checked })}
        />
        Reduce motion
      </label>
    </div>
  );
}

export function AppLayout({ current, children }: { current: string; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const { resetDemo } = useStore();

  useEffect(() => setMenuOpen(false), [current]);

  const navList = (
    <ul className="space-y-1">
      {NAV.map((n) => {
        const active = current === n.to || current.startsWith(n.to + '/') || (n.to === '/find' && current.startsWith('/provider'));
        const Icon = n.icon;
        return (
          <li key={n.to}>
            <a
              href={href(n.to)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[0.95rem] font-semibold transition-colors',
                active ? 'bg-pine-100 text-white ring-1 ring-pine-300 shadow-[inset_3px_0_0_#22c55e]' : 'text-ink-600 hover:bg-white/5 hover:text-white',
              )}
            >
              <Icon aria-hidden className="h-[18px] w-[18px] shrink-0" />
              {n.label}
            </a>
          </li>
        );
      })}
    </ul>
  );

  const resetBtn = (
    <button type="button" onClick={() => setConfirm(true)} className="btn w-full justify-start border border-white/20 px-3 text-sm text-white hover:bg-white/10">
      <RotateCcw aria-hidden className="h-4 w-4" /> Start over
    </button>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[272px_1fr]">
      <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-50 rounded-lg bg-surface px-4 py-2 font-semibold text-pine-900 shadow-lift">
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="on-dark sticky top-0 hidden h-screen flex-col border-r border-line bg-shell/90 px-4 py-6 text-white backdrop-blur lg:flex no-print" aria-label="Sidebar">
        <a href={href('/')} className="mb-8 rounded-lg px-2" aria-label="CareCost home">
          <Logo onDark />
        </a>
        <nav aria-label="Main">{navList}</nav>
        <div className="mt-auto space-y-4 border-t border-white/10 pt-5">
          <div className="rounded-xl border border-line bg-surface p-3 text-ink [&_legend]:text-ink-700 [&_.field-label]:text-ink-700">
            <DisplaySettings />
          </div>
          {resetBtn}
        </div>
      </aside>

      {/* Mobile header */}
      <header className="on-dark sticky top-[env(safe-area-inset-top,0px)] z-30 flex items-center justify-between bg-shell px-4 py-3 text-white lg:hidden no-print">
        <a href={href('/')} aria-label="CareCost home"><Logo onDark /></a>
        <button
          type="button"
          className="btn min-h-[44px] px-3 text-white hover:bg-white/10"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
          Menu
        </button>
      </header>
      {menuOpen && (
        <div id="mobile-nav" className="on-dark sticky top-[68px] z-20 max-h-[calc(100vh-68px)] overflow-y-auto bg-shell px-4 pb-5 text-white shadow-lift lg:hidden">
          <nav aria-label="Main">{navList}</nav>
          <div className="mt-4 space-y-4 border-t border-white/10 pt-4 text-ink">
            <DisplaySettings />
            {resetBtn}
          </div>
        </div>
      )}

      <div className="min-w-0">

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-8 focus:outline-none md:px-8 md:pt-10">
          <div key={current} className="stagger">{children}</div>
        </main>
        <footer className="mx-auto max-w-[1180px] border-t border-line px-4 py-6 text-sm text-ink-600 md:px-8 no-print">
          Estimates only — not medical, insurance or financial advice. Your profile stays on this device.
        </footer>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Start over?"
        confirmLabel="Start over"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          resetDemo();
          navigate('/');
        }}
      >
        This clears your profile, location and checklist on this device.
      </ConfirmDialog>
    </div>
  );
}
