# CareCost — Devpost materials

## Tagline
Making healthcare financially and physically accessible.

## Inspiration
For a wheelchair user, the cheapest neurologist in town isn't cheap if the exam room is too small to turn around in. Skipping that clinic means a longer, wheelchair-accessible ride across town — real money that no price-comparison site counts. Provider directories rarely say whether an accommodation exists, who confirmed it, or when. We wanted a tool that answers the question disabled patients actually face: *where can I get care that accommodates me without creating unnecessary financial strain?*

## What it does
CareCost turns accessibility needs and healthcare economics into one decision:

- **Accessibility profile, no diagnosis required.** Choose from 20 specific accommodations (step-free entrance, accessible exam room, ASL interpreter, quiet waiting area…) and mark each *Essential* or *Preferred* — or describe your needs in your own words and confirm the suggestions.
- **Accessibility-constrained matching.** Essential needs are hard constraints. Providers are labeled *Meets*, *Needs verification* or *Does not meet* — unknown is never treated as yes or no — and every record shows whether it was verified on site, reported by the provider, or missing.
- **True Cost of Access.** Medical share + transportation + parking + any assistance or other costs the user chooses to add. Insurance math (copay or deductible + coinsurance, capped at the out-of-pocket max) is shown step by step.
- **Barrier cost.** CareCost quantifies how much extra a patient pays to travel past the nearest inaccessible clinic — a cost of the system, not the person.
- **Insurance Navigator.** Network status per provider, and a benefits-text explainer that highlights jargon, extracts numbers with their source sentence, flags missing information and drafts questions for the insurer.
- **Access Gap Map.** Where accessible, affordable care clusters — and which neighborhoods have none within 10 miles — with a full keyboard list alternative.
- **Appointment Plan.** A personalized before/during/after checklist with call scripts, plus a printable Access Card.

## How we built it
React 19 + TypeScript + Vite, Tailwind CSS, Recharts and Lucide. All business logic lives in pure, unit-tested TypeScript modules (`matching`, `cost`, `insurance`, `checklist`, `policy`, `needsParser`, `compare`, `gap`) separate from the UI. State is a small context store persisted to `localStorage`; routing is a dependency-free hash router so the app ships as a single static file. We tested with Vitest (24 engine tests), a Playwright end-to-end walkthrough, and axe-core accessibility audits on every page.

## Technical highlights
- **Constraint-first optimization:** classification on essential requirements happens *before* scoring; scoring (cost 45%, insurance 20%, distance 15%, preferences 15%, confidence 5%) only ranks the eligible set, and every rank comes with generated reasons and cautions.
- **Honest uncertainty:** missing insurance inputs widen a low–high range instead of becoming zero; out-of-network and unknown-network cases use conservative bounds; stale (>1 year) accessibility records are flagged.
- **On-device language features:** the needs parser and benefits analyzer are deterministic and private. An optional, opt-in Claude API summary is available for local development and sends only the pasted text.
- **Accessible by construction:** focus management on route change, live-region announcements, icon + text + shape for every status, chart text alternatives and data tables, text-size and reduce-motion controls — 0 axe WCAG A/AA violations.

## Challenges
Modeling cost without penalizing disability. Our first instinct — "accessibility adds cost" — is wrong and harmful. We reframed it: the user's own extra costs are only what they enter, and the app instead measures *barrier cost* created by inaccessible facilities.

## Accomplishments
A complete, working journey from onboarding to a printable appointment plan, with real calculations and explainable recommendations — not static screens.

## What we learned
"Unknown" is the most important accessibility status. Treating missing data as a pass sends people to clinics they can't use; treating it as a fail hides options. A third state plus a call script turns uncertainty into a next step.

## What's next
Verified, community-sourced accessibility audits; real directory, price-transparency and network data; paratransit-aware routing; multi-visit episode costs; co-design and testing with disabled patients.

## Built with
react · typescript · vite · tailwindcss · recharts · lucide · vitest · playwright · axe-core

---

## Suggested 2–3 minute judging demo

**0:00 — The problem (15s).** Home page. "For disabled patients, the cheapest bill isn't always care they can use — or the cheapest way to get care." Point to the sample card: Northgate is cheapest but its exam room is confirmed inaccessible.

**0:15 — Profile (35s).** Click **Find Accessible Care**. Show ZIP validation (type `12`, Continue → error, focus moves to the field), then `30301`. Step 2: click **Use an example → Suggest accommodations** to show plain-language parsing (no need to add them — the sample profile is already set); note step-free entrance and accessible exam room are *Essential*. Click through insurance (Sample Silver PPO) and budget/travel (wheelchair-accessible rideshare) → **See my matches**.

**0:50 — Matching (35s).** Find Care: three groups. Eastbrook is recommended — verified on site. Midtown *needs verification* (exam room unreported) — not guessed. Expand **Show excluded providers**: Northgate and Westmere are cheaper but confirmed not to meet an essential need, so they're never recommended.

**1:25 — True cost (35s).** **Provider Comparison**: Lakeshore has a lower medical estimate than Eastbrook but costs more once a 17-mile accessible ride is included — the verdict says so in words, the chart shows it. Open **Cost Calculator**: formula with live numbers, both insurance models side by side with step-by-step math. Switch travel mode to *I drive* to show how the answer changes.

**2:00 — Insight + navigation (40s).** **Overview**: barrier cost (~$24 extra per visit because the nearest clinic is inaccessible) and "worth a phone call" for Midtown. **Access Gap Map**: hatched neighborhoods with no accessible option within 10 miles; Tab to a marker and press Enter. **Appointment Plan**: checklist with call scripts, tick an item, show the Access Card. Close with: "CareCost asks which provider can accommodate my needs while minimizing what care really costs."

Tip: **Reset demo** in the sidebar restores the sample patient between runs.
