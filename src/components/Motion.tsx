import { useEffect, useRef, useState } from 'react';
import { usd } from '../lib/format';

/** True when the OS or the in-app setting asks for reduced motion. */
export function prefersReducedMotion() {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('reduce-motion')
  );
}

/**
 * Launch splash: the logo draws itself, the wordmark rises, then the overlay
 * fades away (≈1.5s). Shown once per browser session, never blocks input,
 * hidden from screen readers and skipped entirely with reduced motion.
 */
export function Splash() {
  const [show, setShow] = useState(() => {
    if (prefersReducedMotion()) return false;
    try {
      if (sessionStorage.getItem('carecost.splash')) return false;
      sessionStorage.setItem('carecost.splash', '1');
    } catch {
      /* storage unavailable — still show once per load */
    }
    return true;
  });
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 1600);
    return () => clearTimeout(t);
  }, [show]);
  if (!show) return null;
  return (
    <div aria-hidden="true" className="splash pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-shell">
      <div className="absolute inset-0 bg-[radial-gradient(500px_320px_at_50%_45%,rgba(34,197,94,0.22),transparent_70%)]" />
      <div className="relative flex flex-col items-center gap-4">
        <svg className="splash-mark animate-pop" width="72" height="72" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="9" fill="#22c55e" />
          <path d="M9 17.5a7 7 0 0 1 12.2-4.7" fill="none" stroke="#03140a" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M23 14.5a7 7 0 0 1-12.2 4.7" fill="none" stroke="#0b5a2e" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="16" cy="16" r="2.3" fill="#03140a" />
        </svg>
        <p className="animate-rise intro-3 font-display text-3xl font-extrabold tracking-tight text-white">CareCost</p>
        <p className="animate-rise intro-5 text-sm font-semibold uppercase tracking-[0.2em] text-pine-700">Accessible care · true cost</p>
      </div>
    </div>
  );
}

/**
 * Animated dollar figure. Screen readers always get the final value;
 * the counting digits are visual only.
 */
export function CountUp({ value, className, duration = 900 }: { value: number; className?: string; duration?: number }) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));
  const from = useRef(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(a + (value - a) * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return (
    <span className={className}>
      <span className="sr-only">{usd(value)}</span>
      <span aria-hidden="true" className="num">{usd(shown)}</span>
    </span>
  );
}
