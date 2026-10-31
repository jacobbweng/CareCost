import { useId, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COST_KEYS, COST_LABELS, type CostKey } from '../lib/cost';
import { usd } from '../lib/format';
import type { CostBreakdown } from '../lib/types';
import { prefersReducedMotion } from './Motion';
import { cx } from './ui';

export const COST_COLORS: Record<CostKey, string> = {
  medical: '#22c55e',
  transportation: '#a7f3d0',
  parking: '#14b8a6',
  assistance: '#eab308',
  other: '#7f8c85',
};

/** Pattern-free but labeled stacked bar. Every segment is also listed in text. */
export function CostBar({ cost, max, showLegend = true, label }: { cost: CostBreakdown; max?: number; showLegend?: boolean; label?: string }) {
  const scale = max ?? cost.total;
  const parts = COST_KEYS.filter((k) => cost[k] > 0);
  return (
    <div>
      <div
        className="flex h-3.5 w-full overflow-hidden rounded-full bg-paper-200 ring-1 ring-white/5"
        role="img"
        aria-label={`${label ? label + ': ' : ''}Estimated total ${usd(cost.total)} — ${parts.map((k) => `${COST_LABELS[k]} ${usd(cost[k])}`).join(', ')}`}
      >
        {parts.map((k, i) => (
          <span
            key={k}
            style={{ width: `${(cost[k] / Math.max(scale, 1)) * 100}%`, background: COST_COLORS[k] }}
            className={cx('animate-grow-x h-full', i > 0 && 'border-l-2 border-paper')}
          />
        ))}
      </div>
      {showLegend && (
        <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.82rem] text-ink-700" aria-hidden>
          {parts.map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COST_COLORS[k] }} />
              {COST_LABELS[k]} <span className="num font-semibold text-ink">{usd(cost[k])}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface CostRow {
  name: string;
  cost: CostBreakdown;
  note?: string;
}

/**
 * Stacked horizontal bar chart comparing medical-only vs. true cost of access.
 * Always paired with a text summary and an optional data table.
 */
export function CostComparisonChart({ rows, title, summary }: { rows: CostRow[]; title: string; summary: string }) {
  const [table, setTable] = useState(false);
  const captionId = useId();
  const data = rows.map((r) => ({ name: r.name, ...Object.fromEntries(COST_KEYS.map((k) => [k, r.cost[k]])), total: r.cost.total }));
  const active = COST_KEYS.filter((k) => rows.some((r) => r.cost[k] > 0));
  const narrow = typeof window !== 'undefined' && window.innerWidth < 640;
  const height = Math.max(160, rows.length * 58 + 60);

  return (
    <figure aria-labelledby={captionId} className="m-0">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <figcaption id={captionId}>
          <span className="block text-lg font-bold">{title}</span>
          <span className="mt-1 block max-w-2xl text-[0.95rem] text-ink-700">{summary}</span>
        </figcaption>
        <button type="button" className="btn-ghost min-h-[40px] px-3 text-sm" aria-pressed={table} onClick={() => setTable((t) => !t)}>
          {table ? 'Show chart' : 'Show as table'}
        </button>
      </div>
      {table ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-ink-600">
                <th scope="col" className="py-2 pr-3 font-semibold">Provider</th>
                {active.map((k) => (
                  <th key={k} scope="col" className="py-2 pr-3 text-right font-semibold">{COST_LABELS[k]}</th>
                ))}
                <th scope="col" className="py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-b border-line/70">
                  <th scope="row" className="py-2.5 pr-3 font-semibold">{r.name}</th>
                  {active.map((k) => (
                    <td key={k} className="num py-2.5 pr-3 text-right">{usd(r.cost[k])}</td>
                  ))}
                  <td className="num py-2.5 text-right font-bold">{usd(r.cost.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ height }} aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer={false} data={data} layout="vertical" margin={{ top: 4, right: narrow ? 44 : 56, bottom: 4, left: 0 }} barCategoryGap={14}>
              <CartesianGrid horizontal={false} stroke="#1d2824" />
              <XAxis type="number" tickFormatter={(v: number) => usd(v)} tick={{ fill: '#a0ada6', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={narrow ? 92 : 150} tick={{ fill: '#e9f2ec', fontSize: narrow ? 11 : 13, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(34,197,94,0.08)' }}
                formatter={(v, n) => [usd(Number(v)), COST_LABELS[n as CostKey] ?? String(n)]}
                contentStyle={{ borderRadius: 12, border: '1px solid #1d6b45', background: '#0b110f', color: '#e9f2ec', fontSize: 13 }}
                labelStyle={{ color: '#e9f2ec', fontWeight: 700 }}
                itemStyle={{ color: '#c3cec8' }}
              />
              <Legend formatter={(v: string) => <span style={{ color: '#c3cec8', fontSize: 13 }}>{COST_LABELS[v as CostKey]}</span>} />
              {active.map((k, i) => (
                <Bar
                  key={k}
                  dataKey={k}
                  stackId="a"
                  fill={COST_COLORS[k]}
                  stroke="#050807"
                  strokeWidth={1.5}
                  radius={i === active.length - 1 ? [0, 6, 6, 0] : 0}
                  isAnimationActive={!prefersReducedMotion()}
                  animationDuration={800}
                  animationBegin={i * 120}
                >
                  {i === active.length - 1 && (
                    <LabelList dataKey="total" position="right" formatter={(v: unknown) => usd(Number(v))} style={{ fill: '#e9f2ec', fontWeight: 700, fontSize: 13 }} />
                  )}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {!table && (
        <ul className="sr-only">
          {rows.map((r) => (
            <li key={r.name}>
              {r.name}: medical {usd(r.cost.medical)}, total cost of access {usd(r.cost.total)}.
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
