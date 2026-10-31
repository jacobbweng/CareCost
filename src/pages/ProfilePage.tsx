import { CircleCheck, ShieldCheck } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  BudgetTravelSection,
  CareSection,
  CommunicationSection,
  InsuranceSection,
  LocationSection,
  NeedsSection,
  validateLocation,
} from '../components/ProfileSections';
import { PageHeader } from '../components/ui';
import type { Profile } from '../lib/types';
import { href } from '../state/router';
import { useStore } from '../state/store';

function Block({ id, title, desc, children }: { id: string; title: string; desc?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-line py-8 first:border-t-0 first:pt-0">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div>
          <h2 id={id} className="text-xl font-bold">{title}</h2>
          {desc && <p className="mt-1 text-[0.95rem] text-ink-600">{desc}</p>}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

export function ProfilePage() {
  const { profile, setProfile } = useStore();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const patch = (p: Partial<Profile>) => {
    const next = { ...profile, ...p };
    if (p.location !== undefined) setErrors(validateLocation(next));
    setProfile((x) => ({ ...x, ...p }));
  };

  return (
    <>
      <PageHeader
        eyebrow="My accessibility profile"
        title="My profile"
        actions={<a href={href('/start')} className="btn-secondary">Run guided setup again</a>}
      >
        Changes save automatically.
        <p className="mt-2 flex items-center gap-1.5 text-[0.95rem] font-semibold text-pine-800" role="status">
          <CircleCheck aria-hidden className="h-4 w-4" /> Saved
        </p>
      </PageHeader>

      <div className="panel p-6 md:p-8">
        <Block id="p-loc" title="You">
          <LocationSection value={profile} onChange={patch} errors={errors} />
        </Block>
        <Block id="p-care" title="Care">
          <CareSection value={profile} onChange={patch} />
        </Block>
        <Block id="p-needs" title="At the clinic">
          <NeedsSection value={profile} onChange={patch} />
        </Block>
        <Block id="p-ins" title="Paying">
          <InsuranceSection value={profile} onChange={patch} />
        </Block>
        <Block id="p-budget" title="Travel">
          <BudgetTravelSection value={profile} onChange={patch} />
        </Block>
        <Block id="p-comm" title="Access Card" desc="Shown on your visit plan.">
          <CommunicationSection value={profile} onChange={patch} />
        </Block>
      </div>

      <section className="mt-6 flex gap-3 rounded-xl2 border border-line bg-surface p-5" aria-label="Privacy">
        <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-pine-700" />
        <p className="text-[0.95rem] text-ink-700">
          <strong className="text-ink">Privacy:</strong> CareCost never asks for a diagnosis, date of birth, member ID or street address. Your profile stays in this browser. Use “Start over” in the menu to erase it.
        </p>
      </section>
    </>
  );
}
