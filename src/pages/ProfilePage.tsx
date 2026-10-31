import { CircleCheck, ShieldCheck } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  BudgetTravelSection,
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
  const { profile, setProfile, summary } = useStore();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const patch = (p: Partial<Profile>) => {
    const next = { ...profile, ...p };
    if (p.zip !== undefined) setErrors(validateLocation(next));
    setProfile((x) => ({ ...x, ...p }));
  };

  return (
    <>
      <PageHeader
        eyebrow="My accessibility profile"
        title="Your needs, your terms"
        actions={<a href={href('/start')} className="btn-secondary">Run guided setup again</a>}
      >
        Changes save automatically on this device and immediately update your matches.
        <p className="mt-2 flex items-center gap-1.5 text-[0.95rem] font-semibold text-pine-800" role="status">
          <CircleCheck aria-hidden className="h-4 w-4" /> Saved · {summary.meets.length} provider{summary.meets.length === 1 ? '' : 's'} currently meet your essential requirements
        </p>
      </PageHeader>

      <div className="panel p-6 md:p-8">
        <Block id="p-loc" title="Location & care" desc="ZIP code and the type of clinician you need.">
          <LocationSection value={profile} onChange={patch} errors={errors} />
        </Block>
        <Block id="p-needs" title="Accessibility needs" desc="Essential needs are hard requirements. Preferred needs improve ranking.">
          <NeedsSection value={profile} onChange={patch} />
        </Block>
        <Block id="p-ins" title="Insurance" desc="Used for medical cost estimates.">
          <InsuranceSection value={profile} onChange={patch} />
        </Block>
        <Block id="p-budget" title="Budget & travel">
          <BudgetTravelSection value={profile} onChange={patch} />
        </Block>
        <Block id="p-comm" title="Communication & questions" desc="Shown on your Access Card.">
          <CommunicationSection value={profile} onChange={patch} />
          <div className="mt-6">
            <label htmlFor="p-name" className="field-label">Name on Access Card (optional)</label>
            <input id="p-name" className="input max-w-sm" value={profile.name} autoComplete="given-name" onChange={(e) => patch({ name: e.target.value })} />
          </div>
        </Block>
      </div>

      <section className="mt-6 flex gap-3 rounded-xl2 border border-line bg-surface p-5" aria-label="Privacy">
        <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-pine-700" />
        <p className="text-[0.95rem] text-ink-700">
          <strong className="text-ink">Privacy:</strong> CareCost never asks for a diagnosis, date of birth, member ID or street address. Your profile is stored only in this browser&rsquo;s local storage and is never uploaded. Use “Reset demo” in the menu to erase it.
        </p>
      </section>
    </>
  );
}
