import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_ASSUMPTIONS, DEMO_PROFILE, PLAN_BY_ID } from '../data/plans';
import { PROVIDERS } from '../data/providers';
import { matchProviders } from '../lib/matching';
import type { CostAssumptions, MatchSummary, Profile } from '../lib/types';

const KEY = 'carecost.v1';

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

const initial = (): Persisted => ({
  profile: DEMO_PROFILE,
  assumptions: DEFAULT_ASSUMPTIONS,
  compareIds: ['eastbrook-neuro', 'lakeshore-neuro', 'northgate-neuro'],
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
    return {
      ...base,
      ...parsed,
      profile: { ...base.profile, ...(parsed.profile ?? {}) },
      assumptions: { ...base.assumptions, ...(parsed.assumptions ?? {}) },
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return initial();
  }
}

interface Store extends Persisted {
  summary: MatchSummary;
  setProfile: (p: Profile | ((p: Profile) => Profile)) => void;
  setAssumptions: (a: CostAssumptions) => void;
  toggleCompare: (id: string) => void;
  setCompare: (ids: string[]) => void;
  selectProvider: (id: string | null) => void;
  toggleDone: (key: string) => void;
  setSettings: (s: Partial<Settings>) => void;
  completeOnboarding: (p: Profile) => void;
  loadDemo: () => void;
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);

export const MAX_COMPARE = 4;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — app still works in memory */
    }
  }, [state]);

  // Apply display settings
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('text-lg-mode', state.settings.textSize === 'lg');
    root.classList.toggle('text-xl-mode', state.settings.textSize === 'xl');
    root.classList.toggle('reduce-motion', state.settings.reduceMotion);
  }, [state.settings]);

  const summary = useMemo(
    () => matchProviders(state.profile, PROVIDERS, state.assumptions),
    [state.profile, state.assumptions],
  );

  const setProfile = useCallback((p: Profile | ((p: Profile) => Profile)) => {
    setState((s) => {
      const next = typeof p === 'function' ? p(s.profile) : p;
      // keep plan-derived insurance fields in sync when the plan changes
      if (next.planId !== s.profile.planId) {
        const plan = PLAN_BY_ID[next.planId];
        if (plan && plan.method !== 'self_pay' && plan.method !== 'unknown' && plan.id !== 'custom') {
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
    toggleDone: (key) => setState((s) => ({ ...s, done: { ...s.done, [key]: !s.done[key] } })),
    setSettings: (x) => setState((s) => ({ ...s, settings: { ...s.settings, ...x } })),
    completeOnboarding: (p) =>
      setState((s) => {
        const sameSpecialty = s.compareIds.filter((id) => PROVIDERS.find((pr) => pr.id === id)?.specialty === p.specialty);
        return { ...s, profile: p, onboarded: true, compareIds: sameSpecialty, selectedId: null };
      }),
    loadDemo: () => setState((s) => ({ ...initial(), settings: s.settings, onboarded: true })),
    resetDemo: () => setState((s) => ({ ...initial(), settings: s.settings })),
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}
