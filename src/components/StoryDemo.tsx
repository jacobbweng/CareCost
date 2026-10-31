import { Check, ChevronLeft, ChevronRight, CircleQuestionMark, House, Pause, Play, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_ASSUMPTIONS, DEMO_PROFILE } from '../data/plans';
import { AREA_BY_ID, PROVIDERS } from '../data/providers';
import { usd } from '../lib/format';
import { matchProviders } from '../lib/matching';
import { CountUp, prefersReducedMotion } from './Motion';
import { cx } from './ui';

/**
 * An auto-playing six-scene story built from the live matching engine and the
 * synthetic demo data: the cheapest clinic is ruled out, the unknown one is
 * flagged, and the accessible one wins on true cost. Pausable (WCAG 2.2.2),
 * steppable by keyboard, and static when reduced motion is requested.
 */
const DUR = 3000;
const VB = { x: 3.5, y: 1.5, w: 23, h: 14.5 };
const pctX = (x: number) => `${((x - VB.x) / VB.w) * 100}%`;
const pctY = (y: number) => `${((y - VB.y) / VB.h) * 100}%`;

export function StoryDemo() {
  const s = useMemo(() => matchProviders(DEMO_PROFILE, PROVIDERS, DEFAULT_ASSUMPTIONS), []);
  const get = (id: string) => s.results.find((r) => r.provider.id === id)!;
  const north = get('northgate-neuro');
  const mid = get('midtown-neuro');
  const east = s.recommended ?? get('eastbrook-neuro');
  const home = AREA_BY_ID[DEMO_PROFILE.homeAreaId];

  const scenes = [
    { t: 'Jordan needs a neurologist.', sub: 'Jordan uses a wheelchair.' },
    { t: `Cheapest clinic: ${usd(north.cost.medical)}.`, sub: `${north.cost.distanceMiles} miles away.` },
    { t: 'The exam room doesn’t fit.', sub: 'Verified on site. Ruled out.' },
    { t: 'Next clinic: no data.', sub: 'Unknown stays unknown.' },
    { t: `This one works. ${usd(east.cost.total)} all-in.`, sub: `${usd(east.cost.medical)} care + ${usd(east.cost.transportation)} accessible ride.` },
    { t: 'Booked. Plan ready.', sub: 'Calls, questions, Access Card.' },
  ];

  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      setScene((n) => {
        if (n === scenes.length - 1) {
          setCycle((c) => c + 1);
          return 0;
        }
        return n + 1;
      });
    }, scene === scenes.length - 1 ? DUR + 1400 : DUR);
    return () => clearTimeout(t);
  }, [playing, scene, scenes.length]);

  const go = (n: number) => {
    setScene((n + scenes.length) % scenes.length);
    setCycle((c) => c + 1);
  };

  const route = (to: { x: number; y: number }, bend = 1.4) => {
    const mx = (home.x + to.x) / 2;
    const my = (home.y + to.y) / 2 - bend;
    return `M ${home.x} ${home.y} Q ${mx} ${my} ${to.x} ${to.y}`;
  };

  const P = (r: typeof north) => ({ x: r.provider.x!, y: r.provider.y! });

  return (
    <section
      aria-roledescription="carousel"
      aria-label="How CareCost works, in six steps"
      className={cx('relative overflow-hidden rounded-[1.6rem] border border-line bg-surface/80 p-3 shadow-glow backdrop-blur md:p-4', !playing && 'paused')}
    >
      {/* Progress segments */}
      <div className="flex gap-1.5 px-1 pt-1">
        {scenes.map((sc, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={`Step ${i + 1} of ${scenes.length}: ${sc.t}`}
            aria-current={i === scene ? 'step' : undefined}
            className="group relative h-6 flex-1"
          >
            <span className="absolute inset-x-0 top-1/2 block h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/10 group-hover:bg-white/20">
              {i < scene && <span className="block h-full w-full bg-accent" />}
              {i === scene && (
                <span key={`${scene}-${cycle}`} className="seg-fill block h-full w-full bg-accent" style={{ animationDuration: `${scene === scenes.length - 1 ? DUR + 1400 : DUR}ms`, animationPlayState: playing ? 'running' : 'paused' }} />
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Caption */}
      <div className="flex min-h-[92px] items-start justify-between gap-3 px-2 pb-2 pt-3">
        <div key={`${scene}-${cycle}`} aria-live={playing ? 'off' : 'polite'} aria-atomic="true">
          <p className="blur-in font-display text-[1.45rem] font-extrabold leading-tight tracking-tight text-white md:text-[1.7rem]">{scenes[scene].t}</p>
          <p className="blur-in intro-2 mt-1 text-[0.95rem] text-ink-600">{scenes[scene].sub}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink-700 hover:border-pine-300 hover:text-white" onClick={() => go(scene - 1)} aria-label="Previous step">
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </button>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink-700 hover:border-pine-300 hover:text-white" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause story' : 'Play story'} aria-pressed={!playing}>
            {playing ? <Pause aria-hidden className="h-4 w-4" /> : <Play aria-hidden className="h-4 w-4" />}
          </button>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink-700 hover:border-pine-300 hover:text-white" onClick={() => go(scene + 1)} aria-label="Next step">
            <ChevronRight aria-hidden className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Map stage */}
      <div className="relative w-full overflow-hidden rounded-[1.1rem] border border-line bg-[#070c0a]" style={{ aspectRatio: `${VB.w} / ${VB.h}` }}>
        <svg viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <pattern id="story-grid" width="1" height="1" patternUnits="userSpaceOnUse">
              <path d="M 1 0 L 0 0 0 1" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="0.04" />
            </pattern>
            <radialGradient id="story-glow">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect x={VB.x} y={VB.y} width={VB.w} height={VB.h} fill="url(#story-grid)" />
          <path d="M 1 14 C 6 12, 9 16, 14 14.5 S 22 10, 31 12.5" fill="none" stroke="#0e2b2b" strokeWidth="1.1" />
          <path d="M 3 0 L 7 22 M 0 7 L 30 9 M 18 0 L 21 22 M 0 18 L 30 17" stroke="#141d19" strokeWidth="0.22" fill="none" />

          {/* Every neurology clinic, faint */}
          {s.results.map((r) => (
            <circle key={r.provider.id} cx={r.provider.x!} cy={r.provider.y!} r="0.32" fill="#2a3832" />
          ))}

          {/* Routes */}
          {scene >= 1 && scene <= 2 && (
            <path key={`rn-${cycle}`} d={route(P(north), 1)} pathLength={1} fill="none" stroke={scene === 2 ? '#f87171' : '#e9f2ec'} strokeOpacity={scene === 2 ? 0.55 : 0.8} strokeWidth="0.16" strokeDasharray={scene === 2 ? '0.02 0.02' : undefined} className={scene === 1 ? 'route-draw' : ''} strokeLinecap="round" />
          )}
          {scene === 3 && (
            <path key={`rm-${cycle}`} d={route(P(mid), 1.6)} pathLength={1} fill="none" stroke="#f5b942" strokeOpacity="0.8" strokeWidth="0.16" className="route-draw" strokeLinecap="round" />
          )}
          {scene >= 4 && (
            <>
              <circle cx={east.provider.x!} cy={east.provider.y!} r="3.2" fill="url(#story-glow)" className="animate-fade" />
              <path key={`re-${cycle}`} d={route(P(east), 1.8)} pathLength={1} fill="none" stroke="#22c55e" strokeWidth="0.22" className="route-draw" strokeLinecap="round" />
            </>
          )}

          {/* Home pulse */}
          <circle cx={home.x} cy={home.y} r="0.55" fill="#22c55e" className="ping" />
        </svg>

        {/* Home pin */}
        <Pin x={home.x} y={home.y}>
          <span className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[0.7rem] font-bold text-black shadow-lift md:text-xs">
            <House aria-hidden className="h-3.5 w-3.5" /> Jordan
          </span>
        </Pin>

        {scene >= 1 && (
          <Pin x={north.provider.x!} y={north.provider.y!} above>
            <span
              key={`n-${scene >= 2}-${cycle}`}
              className={cx(
                'flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-[0.7rem] font-bold shadow-lift md:text-xs',
                scene >= 2 ? 'shake bg-rust-700 text-[#1a0505]' : 'animate-pop bg-white text-black',
              )}
            >
              {scene >= 2 ? <X aria-hidden className="h-3.5 w-3.5" /> : null}
              {usd(north.cost.medical)}
              {scene >= 2 && <span className="hidden font-semibold sm:inline">· no wheelchair room</span>}
            </span>
          </Pin>
        )}

        {scene >= 3 && (
          <Pin x={mid.provider.x!} y={mid.provider.y!} below>
            <span key={`m-${cycle}`} className="animate-pop flex items-center gap-1 whitespace-nowrap rounded-lg border border-[#5c4512] bg-amberx-100 px-2 py-1 text-[0.7rem] font-bold text-amberx-800 shadow-lift md:text-xs">
              <CircleQuestionMark aria-hidden className="h-3.5 w-3.5" /> exam room unknown
            </span>
          </Pin>
        )}

        {scene >= 4 && (
          <Pin x={east.provider.x!} y={east.provider.y!} above>
            <span key={`e-${cycle}`} className="animate-pop flex items-center gap-1 whitespace-nowrap rounded-lg bg-accent px-2 py-1 text-[0.7rem] font-extrabold text-accent-ink shadow-glow md:text-xs">
              <Check aria-hidden className="h-3.5 w-3.5" /> fits · {usd(east.cost.total)}
            </span>
          </Pin>
        )}

        {/* Cost card */}
        {scene === 4 && (
          <div key={`cost-${cycle}`} className="animate-slide-left absolute bottom-3 right-3 w-[min(250px,60%)] rounded-2xl border border-line bg-shell/90 p-3 text-xs shadow-lift backdrop-blur md:p-4 md:text-sm">
            <p className="font-semibold text-ink-600">True cost of access</p>
            <CountUp value={east.cost.total} className="block font-display text-2xl font-extrabold text-white md:text-3xl" duration={1100} />
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white/10">
              <span className="animate-grow-x h-full bg-accent" style={{ width: `${(east.cost.medical / east.cost.total) * 100}%` }} />
              <span className="animate-grow-x intro-4 h-full border-l-2 border-shell bg-[#a7f3d0]" style={{ width: `${(east.cost.transportation / east.cost.total) * 100}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-ink-600"><span>Care</span><span className="num text-ink">{usd(east.cost.medical)}</span></div>
            <div className="flex justify-between text-ink-600"><span>Accessible ride</span><span className="num text-ink">{usd(east.cost.transportation)}</span></div>
          </div>
        )}

        {/* Plan card */}
        {scene === 5 && (
          <div key={`plan-${cycle}`} className="animate-slide-left absolute bottom-3 right-3 w-[min(260px,64%)] rounded-2xl border border-pine-300 bg-shell/90 p-3 text-xs shadow-glow backdrop-blur md:p-4 md:text-sm">
            <p className="font-display text-sm font-extrabold text-white md:text-base">Your visit plan</p>
            <ul className="mt-2 space-y-1.5">
              {['Reserve the accessible room', 'Confirm in-network', 'Book the accessible ride', 'Bring your Access Card'].map((t, i) => (
                <li key={t} className={cx('animate-rise flex items-center gap-2 text-ink-700', `intro-${i + 2}`)}>
                  <span className={cx('animate-pop grid h-4 w-4 shrink-0 place-items-center rounded-full bg-accent text-accent-ink', `intro-${i + 3}`)}>
                    <Check aria-hidden className="h-3 w-3" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </section>
  );
}

function Pin({ x, y, children, above, below }: { x: number; y: number; children: ReactNode; above?: boolean; below?: boolean }) {
  return (
    <div
      className={cx('absolute z-10 -translate-x-1/2', above ? '-translate-y-[130%]' : below ? 'translate-y-[30%]' : '-translate-y-1/2')}
      style={{ left: pctX(x), top: pctY(y) }}
    >
      {children}
    </div>
  );
}
