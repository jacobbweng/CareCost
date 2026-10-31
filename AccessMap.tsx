import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowRight,
  Car,
  Check,
  CircleCheck,
  CircleQuestionMark,
  CircleX,
  Clock,
  ExternalLink,
  Globe,
  LoaderCircle,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CostBar } from '../components/CostViz';
import { CountUp } from '../components/Motion';
import { LocationSection } from '../components/ProfileSections';
import { RequirementList } from '../components/ProviderCard';
import { PageHeader, cx } from '../components/ui';
import { ACC_BY_ID } from '../data/accommodations';
import { SPECIALTY_BY_ID } from '../data/providers';
import { usd } from '../lib/format';
import { drivingRoute } from '../lib/realProviders';
import type { MatchResult, MatchStatus, Profile } from '../lib/types';
import { href, navigate } from '../state/router';
import { MAX_COMPARE, useStore } from '../state/store';

const STATUS: Record<MatchStatus, { label: string; color: string; glyph: string; Icon: typeof CircleCheck }> = {
  meets: { label: 'Has your must-haves', color: '#22c55e', glyph: '✓', Icon: CircleCheck },
  needs_verification: { label: 'Call to check', color: '#f5b942', glyph: '?', Icon: CircleQuestionMark },
  does_not_meet: { label: 'Missing a must-have', color: '#f87171', glyph: '✕', Icon: CircleX },
};
const ORDER: MatchStatus[] = ['meets', 'needs_verification', 'does_not_meet'];
const PLURAL: Record<MatchStatus, string> = { meets: 'have your must-haves', needs_verification: 'to call and check', does_not_meet: 'missing a must-have' };
type Sort = 'best' | 'cost' | 'distance';

export function AccessMap() {
  const { summary, profile, setProfile, search, compareIds, toggleCompare, selectProvider } = useStore();
  const loc = profile.location;
  const [show, setShow] = useState<Record<MatchStatus, boolean>>({ meets: true, needs_verification: true, does_not_meet: true });
  const [sort, setSort] = useState<Sort>('best');
  const [selected, setSelected] = useState<string | null>(null);
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const spec = SPECIALTY_BY_ID[profile.specialty];

  const ordered = useMemo(() => {
    const all = [...summary.meets, ...summary.needsVerification, ...summary.doesNotMeet].filter((r) => show[r.status]);
    if (sort === 'cost') return [...all].sort((a, b) => a.cost.total - b.cost.total);
    if (sort === 'distance') return [...all].sort((a, b) => a.cost.distanceMiles - b.cost.distanceMiles);
    return all;
  }, [summary, show, sort]);
  const counts = ORDER.map((s) => summary.results.filter((r) => r.status === s).length);
  const sel = summary.results.find((r) => r.provider.id === selected) ?? null;

  // Default selection: best option
  useEffect(() => {
    if (!selected && ordered[0]) setSelected(ordered[0].provider.id);
  }, [ordered, selected]);

  // Real driving route to the selected clinic
  useEffect(() => {
    setRoute(null);
    if (!sel || !loc || sel.provider.lat === undefined) return;
    const ac = new AbortController();
    drivingRoute(loc, { lat: sel.provider.lat, lng: sel.provider.lng! }, ac.signal).then((r) => !ac.signal.aborted && setRoute(r));
    return () => ac.abort();
  }, [sel?.provider.id, loc?.lat, loc?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Leaflet ──
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const routeRef = useRef<L.LayerGroup | null>(null);
  const fittedFor = useRef('');

  useEffect(() => {
    if (!loc || !mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, { zoomControl: true, scrollWheelZoom: false }).setView([loc.lat, loc.lng], 12);
    // CARTO basemap. With a key (VITE_CARTO_KEY) it uses the keyed Voyager tiles; without one it
    // falls back to the free keyless dark tiles so the map never breaks.
    const cartoKey = (import.meta.env.VITE_CARTO_KEY as string | undefined)?.trim();
    const tileUrl = cartoKey
      ? `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${cartoKey}`
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);
    routeRef.current = L.layerGroup().addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      routeRef.current = null;
      fittedFor.current = '';
    };
  }, [loc?.lat, loc?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer || !loc) return;
    layer.clearLayers();
    const radiusM = profile.maxDistance * 1609.34;
    L.circle([loc.lat, loc.lng], { radius: radiusM, color: '#22c55e', weight: 1, opacity: 0.4, fillColor: '#22c55e', fillOpacity: 0.03, interactive: false }).addTo(layer);
    L.marker([loc.lat, loc.lng], { icon: L.divIcon({ className: '', html: '<div class="cc-you">You</div>', iconSize: [44, 24], iconAnchor: [22, 12] }), keyboard: false, interactive: false }).addTo(layer);
    for (const r of ordered) {
      const p = r.provider;
      if (p.lat === undefined || p.lng === undefined) continue;
      const s = STATUS[r.status];
      const active = p.id === selected;
      const m = L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div class="cc-tag ${active ? 'cc-tag-active' : ''}" style="--c:${s.color}"><b>${s.glyph}</b>${usd(r.cost.total)}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        title: `${p.name}: ${s.label}, ${usd(r.cost.total)} estimated, ${r.cost.distanceMiles} miles`,
        alt: p.name,
        zIndexOffset: active ? 1000 : r.status === 'meets' ? 200 : 0,
        riseOnHover: true,
      });
      m.on('click', () => setSelected(p.id));
      m.addTo(layer);
    }
    // Zoom to fit the clinics (and you), so nearby markers don't bunch together
    const pts = ordered.filter((r) => r.provider.lat !== undefined).map((r) => L.latLng(r.provider.lat!, r.provider.lng!));
    const key = `${loc.lat},${loc.lng},${profile.maxDistance},${pts.length}`;
    if (fittedFor.current !== key) {
      if (pts.length) map.fitBounds(L.latLngBounds([L.latLng(loc.lat, loc.lng), ...pts]), { padding: [56, 56], maxZoom: 15, animate: false });
      else map.fitBounds(L.latLng(loc.lat, loc.lng).toBounds(radiusM * 2), { padding: [20, 20], animate: false });
      fittedFor.current = key;
    }
  }, [ordered, selected, loc, profile.maxDistance]);

  useEffect(() => {
    const g = routeRef.current;
    if (!g) return;
    g.clearLayers();
    if (route) {
      L.polyline(route, { color: '#22c55e', weight: 10, opacity: 0.15 }).addTo(g);
      L.polyline(route, { color: '#4ade80', weight: 4, opacity: 0.95 }).addTo(g);
    } else if (sel && loc && sel.provider.lat !== undefined) {
      L.polyline([[loc.lat, loc.lng], [sel.provider.lat, sel.provider.lng!]], { color: '#4ade80', weight: 3, opacity: 0.6, dashArray: '6 8' }).addTo(g);
    }
  }, [route, sel, loc]);

  const pick = (r: MatchResult) => {
    setSelected(r.provider.id);
    if (r.provider.lat !== undefined) mapRef.current?.panTo([r.provider.lat, r.provider.lng!], { animate: true });
  };

  // ── No location yet ──
  if (!loc) {
    return (
      <>
        <PageHeader eyebrow="Map" title="Where are you?" />
        <div className="panel max-w-2xl p-6 md:p-8">
          <LocationSection value={profile} onChange={(p: Partial<Profile>) => setProfile((x) => ({ ...x, ...p }))} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow={spec.label} title={`Clinics near ${loc.label.split(',')[0]}`}>
        <span className="flex flex-wrap gap-2" aria-live="polite">
          {ORDER.map((s, i) => {
            const S = STATUS[s];
            return (
              <button
                key={s}
                type="button"
                aria-pressed={show[s]}
                onClick={() => setShow((x) => ({ ...x, [s]: !x[s] }))}
                className={cx('chip min-h-[40px] border-2 px-3.5 text-sm', show[s] ? 'border-white/20 bg-paper-100 text-white' : 'border-line text-ink-500 line-through')}
              >
                <S.Icon aria-hidden className="h-4 w-4" style={{ color: S.color }} />
                {counts[i]} {PLURAL[s]}
              </button>
            );
          })}
        </span>
      </PageHeader>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <fieldset>
          <legend className="field-label">Within</legend>
          <div className="flex gap-1.5">
            {[5, 10, 15, 25].map((m) => (
              <button key={m} type="button" aria-pressed={profile.maxDistance === m} onClick={() => setProfile((p) => ({ ...p, maxDistance: m }))} className={cx('min-h-[44px] rounded-xl border-2 px-3.5 font-bold', profile.maxDistance === m ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-700 hover:border-pine-300')}>
                {m} mi
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="map-sort" className="field-label">Sort</label>
          <select id="map-sort" className="input min-w-[12rem]" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="best">Best match</option>
            <option value="cost">Lowest total cost</option>
            <option value="distance">Closest</option>
          </select>
        </div>
        <button type="button" className="btn-secondary ml-auto" onClick={search.refresh}>
          <RefreshCw aria-hidden className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        {/* Map */}
        <div className="panel relative overflow-hidden p-0">
          <div ref={mapEl} className="cc-leaflet h-[52vh] min-h-[360px] w-full xl:h-[640px]" role="application" aria-label={`Map of ${ordered.length} ${spec.label.toLowerCase()} clinics near ${loc.label}. Use the list for the same information.`} />
          {search.status === 'loading' && (
            <div className="absolute inset-0 z-[500] grid place-items-center bg-paper/60 backdrop-blur-sm" role="status">
              <p className="flex items-center gap-2 text-lg font-semibold"><LoaderCircle aria-hidden className="h-6 w-6 animate-spin text-pine-700" /> Finding clinics near you…</p>
            </div>
          )}
          <ul className="absolute bottom-3 left-3 z-[400] flex flex-wrap gap-x-3 gap-y-1 rounded-xl bg-shell/85 px-3 py-2 text-xs text-ink-700 backdrop-blur" aria-label="Map key">
            {ORDER.map((s) => <li key={s} className="flex items-center gap-1"><span className="font-black" style={{ color: STATUS[s].color }}>{STATUS[s].glyph}</span>{STATUS[s].label}</li>)}
          </ul>
        </div>

        {/* Selected clinic */}
        <aside aria-label="Selected clinic" className="panel p-5 md:p-6">
          {search.status === 'error' ? (
            <div role="alert">
              <p className="text-lg font-bold">Couldn’t load clinics</p>
              <p className="mt-1 text-ink-600">{search.error}</p>
              <button type="button" className="btn-primary mt-4" onClick={search.refresh}><RefreshCw aria-hidden className="h-4 w-4" /> Try again</button>
            </div>
          ) : !sel ? (
            <p className="text-ink-600">{search.status === 'loading' ? 'Loading…' : `No clinics found within ${profile.maxDistance} miles. Try a wider distance.`}</p>
          ) : (
            <ClinicPanel
              r={sel}
              rank={ordered.findIndex((x) => x.provider.id === sel.provider.id) + 1}
              inCompare={compareIds.includes(sel.provider.id)}
              compareFull={compareIds.length >= MAX_COMPARE}
              onCompare={() => toggleCompare(sel.provider.id)}
              onPlan={() => {
                selectProvider(sel.provider.id);
                navigate('/plan');
              }}
            />
          )}
        </aside>
      </div>

      {/* List — the accessible alternative to the map */}
      <section aria-labelledby="list-h" className="mt-8">
        <h2 id="list-h" className="mb-3 text-xl font-bold">All {ordered.length} clinics</h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {ordered.map((r, i) => {
            const S = STATUS[r.status];
            const on = r.provider.id === selected;
            return (
              <li key={r.provider.id}>
                <button type="button" onClick={() => pick(r)} aria-pressed={on} className={cx('lift flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left', on ? 'border-pine-500 bg-pine-50' : 'border-line bg-surface')}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 font-black" style={{ borderColor: S.color, color: S.color }} aria-hidden>{S.glyph}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-white">{sort === 'best' ? `${i + 1}. ` : ''}{r.provider.name}</span>
                    <span className="block text-sm text-ink-600">{S.label} · {r.cost.distanceMiles} mi{r.provider.driveMinutes ? ` · ${r.provider.driveMinutes} min` : ''}</span>
                  </span>
                  <span className="num shrink-0 text-lg font-extrabold text-white">{usd(r.cost.total)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-ink-500">
          Clinics and wheelchair details: OpenStreetMap contributors. Routes: OSRM. Costs are estimates — see each clinic for how they’re worked out.
        </p>
      </section>
    </>
  );
}

function ClinicPanel({ r, rank, inCompare, compareFull, onCompare, onPlan }: { r: MatchResult; rank: number; inCompare: boolean; compareFull: boolean; onCompare: () => void; onPlan: () => void }) {
  const p = r.provider;
  const S = STATUS[r.status];
  const ask = [...r.unverified, ...r.preferred.filter((c) => c.status === 'unknown')].map((c) => ACC_BY_ID[c.id].short.toLowerCase());
  return (
    <div key={p.id} className="animate-fade">
      <p className="chip border-2 px-3 py-1.5 text-sm" style={{ borderColor: S.color, color: S.color }}>
        <S.Icon aria-hidden className="h-4 w-4" /> {S.label}
      </p>
      <h2 className="mt-3 text-[1.6rem] font-extrabold leading-tight">{p.name}</h2>
      <p className="mt-1 text-ink-600">{p.kind}{rank > 0 ? ` · #${rank} on your list` : ''}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-paper-100 p-3">
          <dt className="text-sm text-ink-600">Estimated total</dt>
          <dd><CountUp value={r.cost.total} className="block font-display text-2xl font-extrabold text-white" duration={600} /></dd>
        </div>
        <div className="rounded-xl bg-paper-100 p-3">
          <dt className="text-sm text-ink-600">Trip</dt>
          <dd className="flex items-center gap-1.5 text-lg font-bold text-white">
            <Car aria-hidden className="h-4 w-4 text-pine-700" /> {r.cost.distanceMiles} mi{p.driveMinutes ? ` · ${p.driveMinutes} min` : ''}
          </dd>
        </div>
      </dl>
      <div className="mt-3"><CostBar cost={r.cost} label={p.name} /></div>

      <h3 className="mb-2 mt-5 text-sm font-bold uppercase tracking-wider text-ink-600">Your needs</h3>
      <RequirementList r={r} />
      {ask.length > 0 && (
        <p className="mt-3 rounded-xl border border-[#5c4512] bg-amberx-50 px-3 py-2 text-sm text-amberx-800">
          <strong>When you call, ask about:</strong> {ask.join(', ')}.
        </p>
      )}

      <ul className="mt-5 space-y-2 text-[0.95rem]">
        {p.address && <li className="flex gap-2"><MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-pine-700" />{p.address}</li>}
        {p.phone && <li className="flex gap-2"><Phone aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-pine-700" /><span className="select-all font-semibold">{p.phone}</span></li>}
        {p.hours && <li className="flex gap-2"><Clock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-pine-700" />{p.hours}</li>}
        {p.website && (
          <li className="flex gap-2"><Globe aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-pine-700" />
            <a href={p.website} target="_blank" rel="noreferrer" className="font-semibold text-pine-800 hover:underline">Website<span className="sr-only"> (opens in new tab)</span></a>
          </li>
        )}
        {p.osmUrl && (
          <li className="flex gap-2"><ExternalLink aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-pine-700" />
            <a href={p.osmUrl} target="_blank" rel="noreferrer" className="font-semibold text-pine-800 hover:underline">View on OpenStreetMap<span className="sr-only"> (opens in new tab)</span></a>
          </li>
        )}
      </ul>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {r.status !== 'does_not_meet' && (
          <button type="button" className="btn-primary sm:col-span-2" onClick={onPlan}>
            Plan this visit <ArrowRight aria-hidden className="h-4 w-4" />
          </button>
        )}
        <button type="button" className="btn-secondary" aria-pressed={inCompare} disabled={!inCompare && compareFull} onClick={onCompare}>
          {inCompare ? <Check aria-hidden className="h-4 w-4" /> : <Plus aria-hidden className="h-4 w-4" />} {inCompare ? 'Comparing' : 'Compare'}
        </button>
        <a href={href(`/provider/${p.id}`)} className="btn-secondary">Cost details</a>
      </div>
    </div>
  );
}
