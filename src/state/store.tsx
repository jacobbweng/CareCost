import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_ASSUMPTIONS, NEW_PROFILE, PLAN_BY_ID } from '../data/plans';
import { matchProviders } from '../lib/matching';
import { loadRealProviders } from '../lib/realProviders';
import type { CostAssumptions, MatchSummary, Profile, Provider } from '../lib/types';

const KEY = 'carecost.v2';
const CACHE_KEY = 'carecost.clinics.v1';
const CACHE_MS = 6 * 60 * 60 * 1000;

export interface Settings {
  textSize: 'base' | 'lg' | 'xl';
  reduceMotion: boolean;
}

interface Persisted {
  profile: Profile;
  assumptions: CostAssumptions;
  compareIds: string[];
  selectedId: string | null;
  done: Record<string, boolean>; // checklist completion, keyed `${providerId}:${taskId}`
  settings: Settings;
  onboarded: boolean;
}

export type SearchStatus = 'no-location' | 'loading' | 'ready' | 'error';

const initial = (): Persisted => ({
  profile: NEW_PROFILE,
  assumptions: DEFAULT_ASSUMPTIONS,
  compareIds: [],
  selectedId: null,
  done: {},
  settings: { textSize: 'base', reduceMotion: false },
  onboarded: false,
});

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial();
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    const base = initial();
    const profile = { ...base.profile, ...(parsed.profile ?? {}) };
    if (!PLAN_BY_ID[profile.planId] || PLAN_BY_ID[profile.planId].hidden) profile.planId = 'unknown';
    return {
      ...base,
      ...parsed,
      profile,
      assumptions: { ...base.assumptions, ...(parsed.assumptions ?? {}) },
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return initial();
  }
}

const searchKey = (p: Profile) => (p.location ? `${p.location.lat.toFixed(4)},${p.location.lng.toFixed(4)}|${p.specialty}|${p.maxDistance}` : '');

function readCache(key: string): Provider[] | null {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as { key: string; at: number; providers: Provider[] } | null;
    return c && c.key === key && Date.now() - c.at < CACHE_MS ? c.providers : null;
  } catch {
    return null;
  }
}
function writeCache(key: string, providers: Provider[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ key, at: Date.now(), providers }));
  } catch {
    /* storage full or blocked — fine */
  }
}

interface Store extends Persisted {
  summary: MatchSummary;
  providers: Provider[];
  search: { status: SearchStatus; error: string; refresh: () => void };
  setProfile: (p: Profile | ((p: Profile) => Profile)) => void;
  setAssumptions: (a: CostAssumptions) => void;
  toggleCompare: (id: string) => void;
  setCompare: (ids: string[]) => void;
  selectProvider: (id: string | null) => void;
  toggleDone: (key: string) => void;
  setSettings: (s: Partial<Settings>) => void;
  completeOnboarding: (p: Profile) => void;
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);

export const MAX_COMPARE = 4;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(load);
  const [providers, setProviders] = useState<Provider[]>(() => readCache(searchKey(state.profile)) ?? []);
  const [status, setStatus] = useState<SearchStatus>(state.profile.location ? 'loading' : 'no-location');
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);
  const lastKey = useRef('');

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — app still works in memory */
    }
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('text-lg-mode', state.settings.textSize === 'lg');
    root.classList.toggle('text-xl-mode', state.settings.textSize === 'xl');
    root.classList.toggle('reduce-motion', state.settings.reduceMotion);
  }, [state.settings]);

  // Load real clinics whenever location, specialty or travel distance changes
  const key = searchKey(state.profile);
  useEffect(() => {
    const loc = state.profile.location;
    if (!loc) {
      setProviders([]);
      setStatus('no-location');
      return;
    }
    const cached = nonce === 0 ? readCache(key) : null;
    if (cached) {
      setProviders(cached);
      setStatus('ready');
      lastKey.current = key;
      return;
    }
    const ac = new AbortController();
    const t = setTimeout(() => {
      setStatus('loading');
      setError('');
      loadRealProviders(loc, state.profile.specialty, state.profile.maxDistance, ac.signal)
        .then((r) => {
          setProviders(r.providers);
          setStatus('ready');
          writeCache(key, r.providers);
          lastKey.current = key;
        })
        .catch((e: Error) => {
          if (e.name === 'AbortError') return;
          setError(e.message);
          setStatus('error');
        });
    }, 250);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [key, nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const summary = useMemo(() => matchProviders(state.profile, providers, state.assumptions), [state.profile, state.assumptions, providers]);

  const setProfile = useCallback((p: Profile | ((p: Profile) => Profile)) => {
    setState((s) => {
      const next = typeof p === 'function' ? p(s.profile) : p;
      if (next.planId !== s.profile.planId) {
        const plan = PLAN_BY_ID[next.planId];
        if (plan && (plan.method === 'copay' || plan.method === 'deductible_coinsurance') && plan.id !== 'custom') {
          next.insurance = {
            method: plan.method,
            copay: plan.copay,
            deductibleRemaining: plan.deductibleRemaining,
            coinsurancePct: plan.coinsurancePct,
            oopRemaining: plan.oopRemaining,
          };
        }
      }
      return { ...s, profile: next };
    });
  }, []);

  const store: Store = {
    ...state,
    summary,
    providers,
    search: { status, error, refresh: () => setNonce((n) => n + 1) },
    setProfile,
    setAssumptions: (a) => setState((s) => ({ ...s, assumptions: a })),
    toggleCompare: (id) =>
      setState((s) => {
        if (s.compareIds.includes(id)) return { ...s, compareIds: s.compareIds.filter((x) => x !== id) };
        if (s.compareIds.length >= MAX_COMPARE) return s;
        return { ...s, compareIds: [...s.compareIds, id] };
      }),
    setCompare: (ids) => setState((s) => ({ ...s, compareIds: ids.slice(0, MAX_COMPARE) })),
    selectProvider: (id) => setState((s) => ({ ...s, selectedId: id })),
    toggleDone: (k) => setState((s) => ({ ...s, done: { ...s.done, [k]: !s.done[k] } })),
    setSettings: (x) => setState((s) => ({ ...s, settings: { ...s.settings, ...x } })),
    completeOnboarding: (p) => setState((s) => ({ ...s, profile: p, onboarded: true, compareIds: [], selectedId: null })),
    resetDemo: () => {
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {
        /* ignore */
      }
      setProviders([]);
      setState((s) => ({ ...initial(), settings: s.settings }));
    },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}
