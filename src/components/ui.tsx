import {
  BadgeCheck,
  CircleCheck,
  CircleDashed,
  CircleQuestionMark,
  CircleX,
  Info,
  MessageSquare,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { fmtDate, isStale, usd } from '../lib/format';
import type { AccStatus, InfoSource, MatchStatus, NetworkStatus } from '../lib/types';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// ── Status indicators: always icon + text, never color alone ──

const STATUS_STYLE: Record<MatchStatus, { cls: string; icon: ReactNode; text: string }> = {
  meets: { cls: 'bg-pine-100 text-pine-900 ring-1 ring-pine-200', icon: <CircleCheck aria-hidden className="h-4 w-4" />, text: 'Meets requirements' },
  needs_verification: { cls: 'bg-amberx-100 text-amberx-800 ring-1 ring-[#5c4512]', icon: <CircleQuestionMark aria-hidden className="h-4 w-4" />, text: 'Needs verification' },
  does_not_meet: { cls: 'bg-rust-50 text-rust-800 ring-1 ring-rust-100', icon: <CircleX aria-hidden className="h-4 w-4" />, text: 'Does not meet requirements' },
};

export function StatusBadge({ status, compact }: { status: MatchStatus; compact?: boolean }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={cx('chip', s.cls)}>
      {s.icon}
      {compact ? s.text.replace(' requirements', '') : s.text}
    </span>
  );
}

export function AccStatusIcon({ status }: { status: AccStatus }) {
  if (status === 'yes') return <CircleCheck aria-hidden className="h-5 w-5 shrink-0 text-pine-700" />;
  if (status === 'no') return <CircleX aria-hidden className="h-5 w-5 shrink-0 text-rust-700" />;
  return <CircleQuestionMark aria-hidden className="h-5 w-5 shrink-0 text-amberx-700" />;
}

export const ACC_STATUS_TEXT: Record<AccStatus, string> = { yes: 'Available', no: 'Not available', unknown: 'Unknown' };

export function SourceTag({ source, date }: { source: InfoSource; date?: string }) {
  const stale = isStale(date);
  if (source === 'verified')
    return (
      <span className="inline-flex items-center gap-1 text-[0.8rem] font-medium text-pine-800">
        <BadgeCheck aria-hidden className="h-3.5 w-3.5" />
        Verified on site{date ? ` · ${fmtDate(date)}` : ''}
        {stale && <span className="text-amberx-700"> (over 1 year old)</span>}
      </span>
    );
  if (source === 'self_reported')
    return (
      <span className="inline-flex items-center gap-1 text-[0.8rem] font-medium text-ink-600">
        <MessageSquare aria-hidden className="h-3.5 w-3.5" />
        Provider-reported{date ? ` · ${fmtDate(date)}` : ''}
        {stale && <span className="text-amberx-700"> (over 1 year old)</span>}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[0.8rem] font-medium text-ink-500">
      <CircleDashed aria-hidden className="h-3.5 w-3.5" />
      No information on file
    </span>
  );
}

export function NetworkBadge({ network, planName }: { network: NetworkStatus; planName?: string }) {
  const map = {
    in: { cls: 'bg-pine-50 text-pine-900 ring-pine-200', t: 'In network' },
    out: { cls: 'bg-rust-50 text-rust-800 ring-rust-100', t: 'Out of network' },
    unknown: { cls: 'bg-paper-100 text-ink-700 ring-line', t: 'Network unknown' },
  }[network];
  return (
    <span className={cx('chip ring-1', map.cls)} title={planName ? `${map.t} — ${planName}` : undefined}>
      {network === 'in' ? <CircleCheck aria-hidden className="h-3.5 w-3.5" /> : network === 'out' ? <CircleX aria-hidden className="h-3.5 w-3.5" /> : <CircleQuestionMark aria-hidden className="h-3.5 w-3.5" />}
      {map.t}
    </span>
  );
}

// ── Plain-language term tooltip (keyboard + screen reader accessible) ──

export const GLOSSARY: Record<string, string> = {
  deductible: 'The amount you pay for covered care each year before your plan starts sharing costs.',
  coinsurance: 'Your percentage share of the allowed amount after your deductible is met.',
  copay: 'A fixed dollar amount you pay for a visit, like $45 per specialist visit.',
  'out-of-pocket maximum': 'The most you pay for covered in-network care in a plan year. After that, the plan pays 100%.',
  'allowed amount': 'The price your plan has agreed to pay for a service. Your share is calculated from this.',
  'in network': 'The provider has a contract with your plan, so you usually pay less.',
  'prior authorization': 'Approval your plan must give before some services, or it may not pay.',
  'true cost of access': 'Your medical share plus transportation, parking and any costs you choose to add — what it actually takes to get to and receive care.',
  'self-pay price': 'The price a clinic lists for patients paying without insurance.',
  'barrier cost': 'Extra cost that comes from inaccessible healthcare — for example, travelling farther because the nearest clinic can’t accommodate you. It reflects the system, not your disability.',
};

export function Term({ term, children }: { term: keyof typeof GLOSSARY | string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!open || !tipRef.current) return setShift(0);
    const r = tipRef.current.getBoundingClientRect();
    const over = r.right - (window.innerWidth - 12);
    const under = 12 - r.left;
    setShift(over > 0 ? -over : under > 0 ? under : 0);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDoc);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open]);
  const def = GLOSSARY[term.toLowerCase()];
  if (!def) return <>{children ?? term}</>;
  return (
    <span ref={ref} className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="cursor-help rounded border-b-2 border-dotted border-pine-500 font-[inherit] text-[inherit] leading-tight"
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children ?? term}
      </button>
      <span
        role="tooltip"
        id={id}
        ref={tipRef}
        style={open ? { transform: `translateX(${shift}px)` } : undefined}
        className={
          open
            ? 'absolute left-0 top-full z-40 mt-2 block w-64 max-w-[calc(100vw-24px)] rounded-xl border border-pine-300 bg-surface-2 px-3.5 py-2.5 text-left text-sm font-normal normal-case leading-snug tracking-normal text-ink shadow-lift'
            : 'sr-only'
        }
      >
        <span className="font-semibold capitalize">{term}: </span>
        {def}
      </span>
    </span>
  );
}

// ── Layout helpers ──

export function PageHeader({ eyebrow, title, children, actions }: { eyebrow?: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 id="page-title" tabIndex={-1} className="text-[1.9rem] font-extrabold leading-tight md:text-[2.4rem] focus:outline-none">
          {title}
        </h1>
        {children && <div className="mt-3 text-[1.05rem] leading-relaxed text-ink-700">{children}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2 no-print">{actions}</div>}
    </header>
  );
}

export function Callout({ tone = 'info', title, children, icon }: { tone?: 'info' | 'warn' | 'danger' | 'success'; title?: string; children: ReactNode; icon?: ReactNode }) {
  const styles = {
    info: 'border-pine-200 bg-pine-50 text-pine-950',
    success: 'border-pine-200 bg-pine-50 text-pine-950',
    warn: 'border-[#5c4512] bg-amberx-50 text-amberx-800',
    danger: 'border-rust-100 bg-rust-50 text-rust-800',
  }[tone];
  const defIcon = tone === 'warn' || tone === 'danger' ? <TriangleAlert aria-hidden className="h-5 w-5" /> : <Info aria-hidden className="h-5 w-5" />;
  return (
    <div className={cx('flex gap-3 rounded-xl border px-4 py-3.5', styles)}>
      <span className="mt-0.5 shrink-0">{icon ?? defIcon}</span>
      <div className="min-w-0 text-[0.95rem] leading-relaxed">
        {title && <p className="font-bold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function Money({ value, className, size = 'md' }: { value: number; className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const s = { sm: 'text-base', md: 'text-xl', lg: 'text-3xl', xl: 'text-[2.6rem]' }[size];
  return <span className={cx('num font-bold tracking-tight', s, className)}>{usd(value)}</span>;
}

export function Segmented<T extends string>({
  legend,
  value,
  options,
  onChange,
  hideLegend,
  size = 'md',
}: {
  legend: string;
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (v: T) => void;
  hideLegend?: boolean;
  size?: 'sm' | 'md';
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className={hideLegend ? 'sr-only' : 'field-label'}>{legend}</legend>
      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-paper-100 p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={cx(
              'relative flex cursor-pointer items-center gap-1.5 rounded-lg font-semibold transition-colors focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-1 focus-within:outline-pine-600',
              size === 'sm' ? 'min-h-[36px] px-2.5 text-[0.82rem]' : 'min-h-[40px] px-3.5 text-sm',
              value === o.value ? 'bg-pine-100 text-white shadow-soft ring-1 ring-pine-300' : 'text-ink-600 hover:text-ink',
            )}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.icon}
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Number input that allows "unknown" (empty → null) */
export function NumberField({
  id,
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
  min = 0,
  max,

  allowEmpty = true,
  error,
}: {
  id: string;
  label: ReactNode;
  value: number | null;
  onChange: (v: number | null) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
  min?: number;
  max?: number;

  allowEmpty?: boolean;
  error?: string;
}) {
  const [text, setText] = useState(value === null ? '' : String(value));
  const [localErr, setLocalErr] = useState<string | null>(null);
  useEffect(() => {
    setText((t) => (Number(t) === value && t !== '' ? t : value === null ? '' : String(value)));
  }, [value]);
  const err = error ?? localErr;
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" aria-hidden>{prefix}</span>}
        <input
          id={id}
          inputMode="decimal"
          className={cx('input num', prefix && 'pl-7', suffix && 'pr-10')}
          value={text}
          aria-invalid={err ? true : undefined}
          aria-describedby={cx(hint && hintId, err && errId) || undefined}
          onChange={(e) => {
            const t = e.target.value.replace(/[$,%\s]/g, '');
            setText(e.target.value);
            if (t === '') {
              if (allowEmpty) {
                setLocalErr(null);
                onChange(null);
              } else setLocalErr('This field is required.');
              return;
            }
            const n = Number(t);
            if (!Number.isFinite(n)) return setLocalErr('Enter a number, for example 250.');
            if (n < min) return setLocalErr(`Enter a value of ${min} or more.`);
            if (max !== undefined && n > max) return setLocalErr(`Enter a value of ${max} or less.`);
            setLocalErr(null);
            onChange(n);
          }}
        />
        {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-500" aria-hidden>{suffix}</span>}
      </div>
      {hint && !err && <p id={hintId} className="field-hint">{hint}</p>}
      {err && (
        <p id={errId} className="mt-1 flex items-center gap-1 text-sm font-semibold text-rust-700">
          <TriangleAlert aria-hidden className="h-4 w-4" /> {err}
        </p>
      )}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={onClose}
      className="w-[min(92vw,30rem)] rounded-xl2 border border-line bg-surface p-0 text-ink shadow-lift backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <h2 id={titleId} className="text-xl font-bold">{title}</h2>
        <div className="mt-2 text-ink-700">{children}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn bg-rust-700 text-[#1a0505] hover:bg-rust-800"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function Stat({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-600">{icon}{label}</p>
      <p className="num text-[1.9rem] font-extrabold leading-none tracking-tight text-ink">{value}</p>
      {sub && <p className="text-sm text-ink-600">{sub}</p>}
    </div>
  );
}

export function SyntheticNote({ className }: { className?: string }) {
  return (
    <p className={cx('inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-ink-600', className)}>
      <Info aria-hidden className="h-3.5 w-3.5" />
      Synthetic demo data — not a real provider.
    </p>
  );
}
