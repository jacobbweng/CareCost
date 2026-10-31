# CareCost

**Making healthcare financially and physically accessible.**

An AI-powered healthcare navigation platform helping people with disabilities find accessible, affordable healthcare through personalized provider matching, insurance analysis, and total cost optimization.

CareCost is a disability-aware healthcare navigator that finds providers who can actually accommodate a patient's accessibility needs, then ranks them by the *true cost of access* — the medical bill plus what it really takes to get there.

> **Demo data notice:** every provider, address, phone number, price, insurance plan, network status and accessibility record in this repository is **synthetic**. Phone numbers use the reserved fictional 555-01xx range. Nothing here describes a real clinic or insurer.

---

## Problem

Healthcare affordability is usually measured by the price of a medical service. For disabled patients, that number misses most of the story:

- The nearest or cheapest clinic may have steps at the entrance, exam rooms too small to turn a wheelchair, or no interpreter.
- Skipping an inaccessible clinic means travelling farther — often by wheelchair-accessible taxi or paratransit — which costs real money.
- Provider directories rarely say *whether* an accommodation exists, *who* confirmed it, or *when*.
- Insurance terms (deductible, coinsurance, prior authorization) are hard to turn into an expected bill.

Directories answer "which doctor is closest?" Price tools answer "which doctor charges least?" Neither answers the question that matters:

**Can I actually access this provider, and what will it really cost me to receive care there?**

## Solution

CareCost combines four capabilities into one journey:

1. **Accessibility-constrained provider matching** — essential needs are hard constraints; unknown information is flagged, never guessed.
2. **True Cost of Access calculator** — `C_total = C_medical + C_transportation + C_assistance + C_parking + C_other`.
3. **Insurance compatibility and benefits navigator** — transparent copay and deductible + coinsurance math, plus a plain-language explainer for pasted policy text.
4. **Personalized navigation** — a checklist with call scripts and a printable Access Card.

## Target audience

People with disabilities — mobility, hearing, vision, sensory and cognitive — who need to find and afford specialist care. Users choose individual accommodations; **no diagnosis is ever requested**.

## Core features

| Feature | What it does |
|---|---|
| **Accessibility Profile** (guided 5-step onboarding + editable profile page) | ZIP, specialty, 20 individual accommodations in 4 categories, each marked *Essential* or *Preferred*; optional plain-language "describe your needs" parser; insurance; budget; travel mode; voluntary extra costs. |
| **Find Care** | Results grouped as **Meets requirements / Needs verification / Does not meet requirements**, each with per-requirement status, information source (verified on site / provider-reported / no information) and date, plain-language reasons and cautions. Filters: specialty, sort, max total cost, in-network, distance. |
| **Provider detail** | Full accessibility record by category, cost breakdown, practical details, and a transparent score breakdown. |
| **Provider Comparison** | 2–4 providers side by side: costs, distance, insurance, every selected accommodation with source, outstanding verification items, an auto-generated trade-off verdict and a stacked cost chart. |
| **Cost Calculator** | Editable cost components with reset-to-estimate, the formula rendered with live numbers, both insurance models computed side by side with step-by-step math, editable travel assumptions and a medical-only vs. true-cost chart (with data-table toggle). |
| **Insurance Navigator** | Network status and estimated share for every provider under the selected plan; benefits-text analyzer that highlights terms, explains them, extracts deductible / coinsurance / specialist copay / OOP max with the source sentence, lists requirements and missing information, drafts insurer questions and can apply extracted numbers to estimates. |
| **Access Gap Map** | Schematic map of a fictional region with status-shaped, keyboard-focusable markers, neighborhoods shaded where no matching option exists within 10 mi, filters (specialty, cost, accommodation, status, network), a summary panel and a full list/table alternative. |
| **Appointment Plan** | Generated before/during/after checklist (verification calls, booking accommodations, referrals, prior authorization, transport, EOB review, financial assistance) with saved progress and a printable Access Card. |
| **Overview dashboard** | Profile summary, top recommendation, match counts, *barrier cost* and *worth a phone call* insights, cost chart and plan progress. |

## Economic model

```
C_total = C_medical + C_transportation + C_assistance + C_parking + C_other
```

- **C_medical** — estimated patient responsibility:
  - *Copay model:* `min(copay, allowed)`
  - *Deductible + coinsurance model:*
    `deductible portion = MIN(allowed, remaining deductible)`
    `post-deductible = allowed − deductible portion`
    `before cap = deductible portion + post-deductible × coinsurance`
  - Both capped at the remaining out-of-pocket maximum.
  - Out of network: the listed self-pay price is used (conservative), with the in-network figure as the low end when the plan has out-of-network benefits.
  - Missing inputs **widen a low–high range** and produce a warning; they never silently become zero.
- **C_transportation** — from distance (straight-line × 1.2 road factor on the demo grid) and travel mode: per-mile vehicle cost, accessible-ride base + per-mile fare, or flat paratransit / transit fares. All assumptions are editable.
- **C_parking** — listed per-visit parking for drivers.
- **C_assistance, C_other** — **only what the user voluntarily enters.**

**Principle:** CareCost never adds a cost because of a disability or an accessibility need. It instead measures **barrier cost** — the extra travel a patient pays because the nearest clinic in their specialty is inaccessible to them — framing it as a cost of the system, not of the person.

### Matching algorithm (`src/lib/matching.ts`)

1. Read essential and preferred accommodations from the profile.
2. Classify each provider in the specialty: any essential confirmed **no** → *Does not meet*; any essential **unknown** → *Needs verification*; all confirmed **yes** → *Meets*.
3. Only *Meets* providers can be recommended. Price can never buy back an essential requirement. If none meet, the UI says so and lists alternatives with their exact gaps.
4. Score eligible providers (normalized within the eligible set): total cost of access 45%, insurance fit 20%, distance 15%, preferred accommodations 15%, information confidence (verified and recent vs. self-reported or stale) 5%; −8 if over budget, −8 if beyond preferred distance.
5. Generate plain-language reasons and cautions for every provider.

## AI implementation

CareCost uses language technology where it adds value, with deterministic, on-device logic as the default so the demo runs with no keys and no data leaves the browser:

- **Needs parser** (`src/lib/needsParser.ts`) turns a description like *"I use a power wheelchair and can't do stairs; bright lights give me headaches"* into suggested accommodations with an essential/preferred level (from strength words such as *can't* / *need*) and simple negation handling. Suggestions are always shown for confirmation.
- **Benefits-language analyzer** (`src/lib/policy.ts`) detects 19 insurance concepts, extracts in-network/individual figures with their source sentence, identifies requirements and gaps and generates insurer questions.
- **Explanation generators** produce match reasons, comparison verdicts, barrier-cost insights and the personalized checklist.
- **Optional LLM summary** (`src/lib/ai.ts`): if a developer sets `VITE_ANTHROPIC_API_KEY` for local use, the Insurance Navigator shows an opt-in button that sends *only the pasted policy text* to the Claude API for a plain-language summary, after telling the user exactly what will be sent. The prompt forbids coverage predictions and medical advice. This path is off by default and was not exercised in the hosted demo. Never ship a real key in a public build.

## Accessibility of the app itself (WCAG 2.2 AA practices)

- Semantic landmarks, headings and lists; skip link; descriptive page titles.
- On every route change, focus moves to the page heading and the change is announced via a live region.
- Full keyboard operation, including map markers (real `<button>`s), segmented controls (native radios), disclosures and a native `<dialog>` for confirmations.
- Strong 3px focus indicator; 44px minimum targets on primary controls.
- **Status never relies on color**: every status has an icon, a text label, and on the map a distinct shape.
- Accessible forms: visible labels, hints, `aria-invalid` + described errors, focus moved to the first invalid field.
- Charts are `aria-hidden` visuals paired with a written summary, a screen-reader list and a "Show as table" toggle.
- Plain-language tooltips for jargon that open on focus and close with Escape.
- Built-in text-size control (100 / 112.5 / 125%) and reduce-motion toggle, plus `prefers-reduced-motion` support.
- Automated audit: **axe-core reports 0 WCAG 2.0/2.1/2.2 A and AA violations** on every page in the end-to-end run.
- No horizontal scrolling at 390 px width or at the largest text size.

## Privacy and safety

- No diagnosis, date of birth, member ID or street address is ever requested.
- The profile is stored only in the browser's `localStorage`; **Reset demo** erases it.
- Nothing is sent to any server by default.
- All estimates are labeled as estimates; CareCost is not a medical provider, insurer or financial guarantee and makes no medical recommendations.
- Every accessibility record shows its source (verified on site / provider-reported / no information) and date; records older than a year are flagged.

## Data limitations

- 12 fictional providers across 4 specialties in a fictional 9-neighborhood region on a schematic grid; distances are illustrative.
- Prices, allowed amounts, networks and accessibility records are invented to exercise the logic.
- Sample plans are simplified (one specialist-visit cost rule each).
- The user's ZIP is collected and validated but, in demo mode, a neighborhood selector stands in for real geolocation.
- Real plan network status cannot be checked; "My own plan" always shows network as unknown.

## Run locally

Requirements: Node.js 20+.

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # 24 unit tests for the matching, cost, insurance, policy, parser, compare and gap engines
npm run build          # production build in dist/
npm run build:single   # one self-contained HTML file in dist-single/index.html (open it directly or host anywhere)
```

Optional (local development only): create `.env.local` with `VITE_ANTHROPIC_API_KEY=...` to enable the opt-in AI summary.

## Project structure

```
src/
  data/          accommodations catalog, synthetic providers & regions, sample plans, demo profile
  lib/           pure business logic (no React): matching, cost, insurance, checklist, policy, needsParser, compare, gap, ai
  state/         localStorage-backed store, tiny hash router
  components/    Layout, ProviderCard, CostViz (charts), ProfileSections (forms), ui primitives
  pages/         Home, Onboarding, Dashboard, FindCare, ProviderDetail, Compare, CostCalculator, InsuranceNavigator, AccessMap, Plan, ProfilePage
```

## Technical stack

React 19 · TypeScript · Vite · Tailwind CSS 3 · Recharts · Lucide icons · Vitest · axe-core + Playwright for audits. No backend required.

**Design:** dark black-and-green theme (Manrope headings, Public Sans body). The landing page tells the product story as a pausable, six-scene animation driven by the real matching engine (cheapest clinic ruled out → unknown clinic flagged → accessible clinic wins on true cost → plan ready). Also: a short launch splash, staggered intro and page-transition animations, count-up figures and growing cost bars. All motion is disabled by the operating system's reduced-motion setting or the in-app "Reduce motion" switch, and every color pair passes WCAG AA contrast.

## Future improvements

- Community and clinic-submitted accessibility audits with photo evidence, verification workflows and freshness scoring.
- Real provider directories (e.g. NPI data) and price-transparency files; real geocoding and routing with paratransit service areas.
- Insurer network lookups and eligibility checks via standards-based APIs.
- Multi-visit and episode-of-care cost modeling (e.g. a course of therapy), and telehealth substitution savings.
- Shareable Access Card (QR / wallet pass), multilingual and ASL video content.
- Usability testing with disabled patients and disability organizations; screen-reader and switch-access testing beyond automated audits.

See [DEVPOST.md](DEVPOST.md) for the submission write-up and a 2–3 minute demo script.
