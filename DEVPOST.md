# CareCost — Devpost materials

## Tagline
Making healthcare financially and physically accessible.

## Inspiration
For a wheelchair user, the cheapest neurologist in town isn't cheap if the exam room is too small to turn around in. Skipping that clinic means a longer, wheelchair-accessible ride across town — real money that no price-comparison site counts. Provider directories rarely say whether an accommodation exists, who confirmed it, or when. We wanted a tool that answers the question disabled patients actually face: *where can I get care that accommodates me without creating unnecessary financial strain?*

## What it does
CareCost turns accessibility needs and healthcare economics into one decision:

- **Real data.** Live OpenStreetMap clinics with wheelchair tags, OSRM road distances, 2026 Medicare prices and IRS mileage rates.
- **Accessibility profile, no diagnosis required.** Choose from 20 specific accommodations (step-free entrance, accessible exam room, ASL interpreter, quiet waiting area…) and mark each *Essential* or *Preferred* — or describe your needs in your own words and confirm the suggestions.
- **Accessibility-constrained matching.** Essential needs are hard constraints. Providers are labeled *Meets*, *Needs verification* or *Does not meet* — unknown is never treated as yes or no — and every record shows whether it was verified on site, reported by the provider, or missing.
- **True Cost of Access.** Medical share + transportation + parking + any assistance or other costs the user chooses to add. Insurance math (copay or deductible + coinsurance, capped at the out-of-pocket max) is shown step by step.
- **Barrier cost.** CareCost quantifies how much extra a patient pays to travel past the nearest inaccessible clinic — a cost of the system, not the person.
- **Insurance Navigator.** Network status per provider, and a benefits-text explainer that highlights jargon, extracts numbers with their source sentence, flags missing information and drafts questions for the insurer.
- **Real location + live map.** "Use my location" finds real clinics nearby from OpenStreetMap with community-mapped wheelchair access, judged by the same hard-constraint rules.
- **Access Gap Map.** Where accessible, affordable care clusters — and which neighborhoods have none within 10 miles — with a full keyboard list alternative.
- **Appointment Plan.** A personalized before/during/after checklist with call scripts, plus a printable Access Card.

## How we built it
React 19 + TypeScript + Vite, Tailwind CSS, Recharts and Lucide. All business logic lives in pure, unit-tested TypeScript modules (`matching`, `cost`, `insurance`, `checklist`, `policy`, `needsParser`, `compare`, `gap`) separate from the UI. State is a small context store persisted to `localStorage`; routing is a dependency-free hash router so the app ships as a single static file. We tested with Vitest (24 engine tests), a Playwright end-to-end walkthrough, and axe-core accessibility audits on every page.

## Technical highlights
- **Constraint-first optimization:** classification on essential requirements happens *before* scoring; scoring (cost 45%, insurance 20%, distance 15%, preferences 15%, confidence 5%) only ranks the eligible set, and every rank comes with generated reasons and cautions.
- **Honest uncertainty:** missing insurance inputs widen a low–high range instead of becoming zero; out-of-network and unknown-network cases use conservative bounds; stale (>1 year) accessibility records are flagged.
- **On-device language features:** the needs parser and benefits analyzer are deterministic and private. Optional, opt-in DeepSeek features (AI needs suggestions and plain-language policy summaries) run through a local server-side proxy, so the API key never reaches the browser; only the text the user chooses is sent.
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

**0:00 — The story (25s).** Reload the home page: the logo animates in, then the full-screen intro. Scroll to the mission, then let the six-scene story play: cheapest clinic ruled out, unknown clinic flagged, accessible clinic wins on true cost.

**0:25 — Setup (45s).** Click **Go to app**. Type a name, press **Use my location** (or enter a ZIP). Pick a type of care. Mark *step-free entrance* and *accessible exam room* as **Must have**. Open "describe it in your own words" and press **Ask AI** to show DeepSeek suggestions. Choose **Medicare**, then **I drive** → **Show my map**.

**1:10 — Live map (40s).** Real clinics nearby with ✓ / ? / ✕ markers and estimated totals. Click a clinic: the real driving route draws, the panel shows its wheelchair data from OpenStreetMap, what's still unknown ("ask about: accessible exam room"), phone and hours. Point out that unknown stays unknown and clinics missing a must-have are never recommended.

**1:50 — Costs (30s).** **Costs**: the visit uses Medicare's real 2026 rate and the $283 Part B deductible, explained in plain sentences; getting there uses real road miles × the IRS rate. Change the deductible to $0 and watch the total drop to 20%.

**2:20 — Plan (20s).** **Plan this visit**: the checklist with call scripts and the Access Card. Close: "CareCost finds care you can actually get to — and what it really costs."

Tip: **Start over** in the sidebar clears everything between runs.
