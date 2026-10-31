import { CircleCheck, CircleQuestionMark, CircleX, House, List, Map as MapIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ProviderCard } from '../components/ProviderCard';
import { NetworkBadge, PageHeader, Segmented, Stat, StatusBadge, cx } from '../components/ui';
import { ACCOMMODATIONS } from '../data/accommodations';
import { PLAN_BY_ID } from '../data/plans';
import { AREAS, AREA_BY_ID, DEMO_REGION_NAME, SPECIALTIES } from '../data/providers';
import { usd } from '../lib/format';
import { COVERAGE_RADIUS_MI, areaCoverage } from '../lib/gap';
import type { AccId, MatchResult, MatchStatus, Profile } from '../lib/types';
import { href } from '../state/router';
import { useStore } from '../state/store';

const W = 30;
const H = 24;
const pct = (v: number, max: number) => `${(v / max) * 100}%`;

const MARKER: Record<MatchStatus, { cls: string; icon: typeof CircleCheck; shape: string }> = {
  meets: { cls: 'bg-accent text-accent-ink ring-pine-800', icon: CircleCheck, shape: 'rounded-full' },
  needs_verification: { cls: 'bg-amberx-100 text-amberx-800 ring-amberx-700', icon: CircleQuestionMark, shape: 'rounded-md rotate-0' },
  does_not_meet: { cls: 'bg-surface text-rust-700 ring-rust-700', icon: CircleX, shape: 'rounded-sm' },
};

export function AccessMap() {
  const { summary, profile, setProfile, assumptions } = useStore();
  const plan = PLAN_BY_ID[profile.planId];
  const hasNetwork = plan.method !== 'self_pay' && plan.method !== 'unknown' && plan.id !== 'custom';
  const [view, setView] = useState<'map' | 'list'>('map');
  const [maxCost, setMaxCost] = useState(600);
  const [inNet, setInNet] = useState(false);
  const [mustHave, setMustHave] = useState<AccId | ''>('');
  const [show, setShow] = useState<Record<MatchStatus, boolean>>({ meets: true, needs_verification: true, does_not_meet: true });
  const [selected, setSelected] = useState<string | null>(summary.recommended?.provider.id ?? null);

  const filtered = useMemo(
    () =>
      summary.results.filter(
        (r) =>
          show[r.status] &&
          r.cost.total <= maxCost &&
          (!inNet || !hasNetwork || r.network === 'in') &&
          (!mustHave || r.provider.access[mustHave]?.status === 'yes'),
      ),
    [summary, show, maxCost, inNet, mustHave, hasNetwork],
  );
  const coverage = useMemo(() => areaCoverage(filtered, assumptions), [filtered, assumptions]);
  const meets = filtered.filter((r) => r.status === 'meets');
  const verify = filtered.filter((r) => r.status === 'needs_verification');
  const covered = coverage.filter((c) => c.covered);
  const gaps = coverage.filter((c) => !c.covered);
  const home = AREA_BY_ID[profile.homeAreaId];
  const sel = summary.results.find((r) => r.provider.id === selected) ?? null;
  const allTotals = summary.results.map((r) => r.cost.total);
  const costCeil = Math.ceil(Math.max(...allTotals, 100) / 50) * 50;

  return (
    <>
      <PageHeader
        eyebrow="Access Gap Map"
        title="Where accessible, affordable care is — and isn’t"
        actions={<Segmented legend="View" hideLegend value={view} onChange={setView} options={[{ value: 'map', label: 'Map', icon: <MapIcon aria-hidden className="h-4 w-4" /> }, { value: 'list', label: 'List', icon: <List aria-hidden className="h-4 w-4" /> }]} />}
      >
        A schematic map of the <strong>{DEMO_REGION_NAME}</strong>. Locations are synthetic and not to scale. Shaded neighborhoods have no option that meets your essential requirements within {COVERAGE_RADIUS_MI} miles.
      </PageHeader>

      {/* Summary panel */}
      <section className="panel mb-6 grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4" aria-label="Accessibility summary">
        <Stat label="Meet your essential needs" value={meets.length} icon={<CircleCheck aria-hidden className="h-4 w-4 text-pine-700" />} sub={`of ${filtered.length} shown`} />
        <Stat label="Need verification" value={verify.length} icon={<CircleQuestionMark aria-hidden className="h-4 w-4 text-amberx-700" />} sub="information missing" />
        <Stat
          label="Total cost range (eligible)"
          value={meets.length + verify.length ? `${usd(Math.min(...[...meets, ...verify].map((r) => r.cost.total)))}–${usd(Math.max(...[...meets, ...verify].map((r) => r.cost.total)))}` : '—'}
          sub="true cost of access"
        />
        <Stat label="Neighborhoods covered" value={`${covered.length}/${coverage.length}`} sub={`with a matching option ≤ ${COVERAGE_RADIUS_MI} mi`} />
      </section>

      {/* Filters */}
      <section className="panel mb-6 grid gap-5 p-5 md:grid-cols-2 lg:grid-cols-4" aria-label="Map filters">
        <div>
          <label htmlFor="m-spec" className="field-label">Specialty</label>
          <select id="m-spec" className="input" value={profile.specialty} onChange={(e) => setProfile((p) => ({ ...p, specialty: e.target.value as Profile['specialty'] }))}>
            {SPECIALTIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="m-cost" className="field-label">Max total cost: <span className="num">{usd(maxCost)}</span></label>
          <input id="m-cost" type="range" min={100} max={Math.max(costCeil, 200)} step={10} value={Math.min(maxCost, Math.max(costCeil, 200))} onChange={(e) => setMaxCost(Number(e.target.value))} className="mt-3 w-full accent-pine-700" aria-valuetext={usd(maxCost)} />
        </div>
        <div>
          <label htmlFor="m-acc" className="field-label">Must offer</label>
          <select id="m-acc" className="input" value={mustHave} onChange={(e) => setMustHave(e.target.value as AccId | '')}>
            <option value="">Any accommodation</option>
            {ACCOMMODATIONS.map((a) => <option key={a.id} value={a.id}>{a.short}</option>)}
          </select>
        </div>
        <fieldset>
          <legend className="field-label">Show</legend>
          <div className="space-y-0.5 text-[0.93rem]">
            {(['meets', 'needs_verification', 'does_not_meet'] as MatchStatus[]).map((s) => (
              <label key={s} className="flex min-h-[32px] items-center gap-2">
                <input type="checkbox" className="h-[18px] w-[18px] accent-pine-700" checked={show[s]} onChange={(e) => setShow((x) => ({ ...x, [s]: e.target.checked }))} />
                {s === 'meets' ? 'Meets requirements' : s === 'needs_verification' ? 'Needs verification' : 'Does not meet'}
              </label>
            ))}
            <label className={cx('flex min-h-[32px] items-center gap-2', !hasNetwork && 'opacity-60')}>
              <input type="checkbox" className="h-[18px] w-[18px] accent-pine-700" checked={inNet} disabled={!hasNetwork} onChange={(e) => setInNet(e.target.checked)} />
              In network only
            </label>
          </div>
        </fieldset>
      </section>

      <p className="sr-only" role="status" aria-live="polite">{filtered.length} providers shown.</p>

      {view === 'map' ? (
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <section className="panel overflow-hidden p-3 md:p-4" aria-labelledby="map-h">
            <h2 id="map-h" className="sr-only">Demonstration map. Each provider marker is a button; use Tab to move between them.</h2>
            <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
              <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
                <defs>
                  <pattern id="hatch" width="0.6" height="0.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="0.6" stroke="#b7793f" strokeWidth="0.16" />
                  </pattern>
                </defs>
                <rect width={W} height={H} rx="0.8" fill="#0a100d" />
                <path d="M -1 14 C 6 12, 9 16, 14 14.5 S 22 10, 31 12.5" fill="none" stroke="#0e2b2b" strokeWidth="1.1" />
                <path d="M 3 0 L 7 22 M 0 7 L 30 9 M 18 0 L 21 22 M 0 18 L 30 17" stroke="#16201c" strokeWidth="0.25" fill="none" />
                {coverage.map((c) => (
                  <g key={c.area.id}>
                    <circle cx={c.area.x} cy={c.area.y} r="2.3" fill={c.covered ? '#0d2c1c' : 'url(#hatch)'} stroke={c.covered ? '#22c55e' : '#b7793f'} strokeWidth="0.08" strokeDasharray={c.covered ? undefined : '0.3 0.2'} opacity="0.9" />
                    <text x={c.area.x} y={c.area.y + 3.2} textAnchor="middle" fontSize="0.78" fontWeight="700" fill="#c3cec8" paintOrder="stroke" stroke="#0a100d" strokeWidth="0.25">
                      {c.area.name}
                      {!c.covered && <tspan fill="#f5b942" fontSize="0.62"> · GAP</tspan>}
                    </text>
                  </g>
                ))}
              </svg>
              {/* Home */}
              {home && (
                <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: pct(home.x, W), top: pct(home.y, H) }}>
                  <span className="flex items-center gap-1 rounded-full bg-ink px-2 py-1 text-[0.72rem] font-bold text-paper shadow-soft">
                    <House aria-hidden className="h-3.5 w-3.5" /> You
                  </span>
                </div>
              )}
              {filtered.map((r) => {
                const m = MARKER[r.status];
                const Icon = m.icon;
                const active = r.provider.id === selected;
                return (
                  <button
                    key={r.provider.id}
                    type="button"
                    onClick={() => setSelected(r.provider.id)}
                    aria-pressed={active}
                    aria-label={`${r.provider.name}: ${r.status === 'meets' ? 'meets requirements' : r.status === 'needs_verification' ? 'needs verification' : 'does not meet requirements'}, ${usd(r.cost.total)} total, ${r.cost.distanceMiles} miles`}
                    className={cx(
                      'absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 px-1.5 py-1 text-[0.72rem] font-bold shadow-soft ring-2 transition-transform hover:z-10 hover:scale-105 focus-visible:z-20',
                      m.cls,
                      m.shape,
                      active && 'z-10 scale-110 outline outline-[3px] outline-offset-2 outline-pine-600',
                    )}
                    style={{ left: pct(r.provider.x, W), top: pct(r.provider.y, H) }}
                  >
                    <Icon aria-hidden className="h-4 w-4" />
                    <span className="num hidden sm:inline">{usd(r.cost.total)}</span>
                  </button>
                );
              })}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 px-1 text-[0.82rem] text-ink-700" aria-label="Map legend">
              <li className="flex items-center gap-1.5"><CircleCheck aria-hidden className="h-4 w-4 text-pine-800" /> Meets (round marker)</li>
              <li className="flex items-center gap-1.5"><CircleQuestionMark aria-hidden className="h-4 w-4 text-amberx-700" /> Needs verification</li>
              <li className="flex items-center gap-1.5"><CircleX aria-hidden className="h-4 w-4 text-rust-700" /> Does not meet</li>
              <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-3 rounded-full border border-dashed border-[#b7793f] bg-[repeating-linear-gradient(45deg,#b7793f_0_1px,transparent_1px_4px)]" /> Access gap (hatched)</li>
              <li>Demonstration map — not real geography.</li>
            </ul>
          </section>

          <aside className="space-y-5" aria-label="Selected provider and gaps">
            {sel ? (
              <div className="panel p-5">
                <p className="eyebrow">Selected</p>
                <h2 className="mt-1 text-lg font-bold"><a className="hover:underline" href={href(`/provider/${sel.provider.id}`)}>{sel.provider.name}</a></h2>
                <div className="mt-2 flex flex-wrap gap-2"><StatusBadge status={sel.status} compact />{hasNetwork && <NetworkBadge network={sel.network} />}</div>
                <p className="mt-3 text-sm text-ink-700">{AREA_BY_ID[sel.provider.areaId]?.name} · {sel.cost.distanceMiles} mi from you</p>
                <p className="mt-2"><span className="num text-2xl font-extrabold">{usd(sel.cost.total)}</span> <span className="text-sm text-ink-600">true cost · {usd(sel.cost.medical)} medical</span></p>
                <p className="mt-2 text-sm text-ink-700">{(sel.status === 'does_not_meet' ? sel.reasons : sel.cautions.length ? sel.cautions : sel.reasons.slice(0, 2))[0]}</p>
                <a className="btn-secondary mt-4" href={href(`/provider/${sel.provider.id}`)}>View details</a>
              </div>
            ) : (
              <div className="panel p-5 text-ink-700">Select a marker to see details.</div>
            )}
            <div className="panel p-5">
              <h2 className="text-lg font-bold">Gaps in accessible care</h2>
              {gaps.length === 0 ? (
                <p className="mt-2 text-ink-700">Every neighborhood has a matching option within {COVERAGE_RADIUS_MI} mi.</p>
              ) : (
                <ul className="mt-3 space-y-2.5 text-[0.95rem]">
                  {gaps.map((g) => (
                    <li key={g.area.id}>
                      <strong>{g.area.name}</strong>
                      <span className="block text-sm text-ink-700">
                        {g.nearestMeets ? `Nearest matching option: ${g.nearestMeets.result.provider.name}, ${g.nearestMeets.miles} mi.` : 'No matching option anywhere in the filtered results.'}
                        {g.nearestAny && g.nearestAny.result.status !== 'meets' && g.nearestAny.miles <= COVERAGE_RADIUS_MI && ` Closer clinic ${g.nearestAny.result.provider.name} (${g.nearestAny.miles} mi) ${g.nearestAny.result.status === 'does_not_meet' ? 'does not meet' : 'is unverified for'} your needs.`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <section aria-labelledby="list-h">
          <h2 id="list-h" className="sr-only">Provider list</h2>
          {filtered.length === 0 ? <p className="panel p-6">No providers match these filters.</p> : (
            <div className="space-y-5">
              {[...filtered].sort((a, b) => order(a) - order(b) || b.score - a.score).map((r) => <ProviderCard key={r.provider.id} r={r} />)}
            </div>
          )}
          <h3 className="mb-3 mt-10 text-lg font-bold">Neighborhood coverage</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-[0.95rem]">
              <thead><tr className="border-b border-line text-sm text-ink-600"><th scope="col" className="py-2 pr-3">Neighborhood</th><th scope="col" className="py-2 pr-3">Coverage</th><th scope="col" className="py-2">Nearest matching option</th></tr></thead>
              <tbody>
                {coverage.map((c) => (
                  <tr key={c.area.id} className="border-b border-line/70">
                    <th scope="row" className="py-2.5 pr-3 font-semibold">{c.area.name}</th>
                    <td className="py-2.5 pr-3">{c.covered ? '✓ Covered' : '⚠ Access gap'}</td>
                    <td className="py-2.5">{c.nearestMeets ? `${c.nearestMeets.result.provider.name} (${c.nearestMeets.miles} mi)` : 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <p className="mt-6 text-sm text-ink-600">Neighborhoods: {AREAS.map((a) => a.name).join(', ')}. All synthetic.</p>
    </>
  );
}

const order = (r: MatchResult) => (r.status === 'meets' ? 0 : r.status === 'needs_verification' ? 1 : 2);
