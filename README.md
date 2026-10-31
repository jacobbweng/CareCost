# CareCost

**Making healthcare financially and physically accessible.**

An AI-powered healthcare navigation platform helping people with disabilities find accessible, affordable healthcare through personalized provider matching, insurance analysis, and total cost optimization.

CareCost is a disability-aware healthcare navigator that finds providers who can actually accommodate a patient's accessibility needs, then ranks them by the *true cost of access* — the medical bill plus what it really takes to get there.

> **Real data:** clinics and wheelchair access come live from OpenStreetMap, road distances and drive times from OSRM, prices from the 2026 Medicare Physician Fee Schedule, and payer rules from public sources (see *Data sources*). Every cost is an estimate, and anything not publicly known — exam-room access, insurer networks — is shown as unknown, never guessed.

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
| **Simple setup** | Five short screens, one question each, big tap targets: name + location (GPS or ZIP), type of care, accessibility needs (**Must have** / **Nice to have**, with plain-language or AI suggestions), how you pay (private, Medicare, Medicaid, none, not sure), how you travel and how far. Ends on the map. |
| **Live map** | Real clinics within 5–25 miles on a dark Leaflet map. Each marker shows status (✓ / ? / ✕) and estimated total cost; the selected clinic gets a real driving route, an estimate, your needs checked against its record, "ask about" prompts, phone, hours, website. Filter by status, sort by match, cost or distance. A full keyboard-friendly list mirrors the map. |
| **Matches** | The same clinics grouped as **Has your must-haves / Call to check / Missing a must-have**, with reasons and cautions. |
| **Cost calculator** | A plain receipt: (1) the visit — typical price from Medicare's 2026 rate × your payer, your deductible/coinsurance or copay, explained in sentences; (2) getting there — real road miles × IRS rate or your ride fare; (3) anything else. Every number is editable. |
| **Compare** | 2–4 clinics side by side with a written trade-off verdict and chart. |
| **Insurance** | Payer types with real 2026 rules, and a plain-language explainer for pasted policy text (on-device, with optional DeepSeek AI). |
| **Visit plan** | A personalized before/during/after checklist with call scripts, plus an Access Card. |
| **Overview** | Best match (or best clinic to call first), counts, barrier cost and plan progress. |

## Data sources

| Data | Source | Notes |
|---|---|---|
| Clinics, addresses, phones, hours, wheelchair entrance/restroom | OpenStreetMap (Overpass API) | Volunteer-mapped; shown as "Mapped by OpenStreetMap volunteers". Untagged = unknown. |
| Road distance and drive time, route lines | OSRM public routing server | Falls back to straight-line × 1.2 if unavailable. |
| ZIP → coordinates | Zippopotam.us | |
| GPS → city/ZIP | BigDataCloud reverse geocoding | |
| New-patient visit price | 2026 Medicare Physician Fee Schedule: CPT 99204 $177.36 (specialists), CPT 99203 $117.57 (primary care) | National non-facility rates. |
| Private / cash price | ×1.43 Medicare (KFF review: private insurers pay ~143% of Medicare for physician services) | Users can enter a quoted price. |
| Medicare cost-sharing | 2026 Part B: $283 deductible, 20% coinsurance (Federal Register, Nov 19 2025) | |
| Driving cost | IRS medical mileage rate, Jul–Dec 2026: 23.5¢/mile | Editable. |
| Accessible ride / paratransit fares | Typical starting values, clearly editable | No public national data. |

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

Core features are deterministic and work with no keys. AI is an optional layer for language tasks only, never for arithmetic, matching or accessibility decisions:

- **On-device language features** (always on): the needs parser (`src/lib/needsParser.ts`) turns plain-language descriptions into suggested accommodations; the benefits analyzer (`src/lib/policy.ts`) finds terms, numbers, requirements and gaps; explanation generators write match reasons, comparison verdicts and the checklist.
- **DeepSeek (optional)** (`src/lib/ai.ts`): with a DeepSeek API key in `.env.local`, two opt-in buttons appear — **Ask AI** (needs → suggested accommodations, validated against the fixed list and always confirmed by the user) and **Explain with AI** (plain-language summary of pasted policy text; the prompt forbids coverage predictions and medical advice). The Vite dev/preview server proxies `/api/ai` to DeepSeek's Chat Completions API and adds the key server-side, so **the key never reaches the browser bundle or Git**. Only the text the user chose to send is sent.

```bash
cp .env.example .env.local   # then edit .env.local
# DEEPSEEK_API_KEY=<your DeepSeek API key>
# DEEPSEEK_MODEL=deepseek-chat
```

## Real location (live data)

- **Use my location** (setup, profile and Map page) uses the browser's Geolocation API after the user agrees, then BigDataCloud's free client reverse-geocoder to fill in the ZIP code and area name. The location stays on the device.
- The **Map** page lists real clinics, doctors and hospitals near the user from **OpenStreetMap** (Overpass API) on a Leaflet map, with community-mapped wheelchair access (`wheelchair=yes|limited|no`, `toilets:wheelchair`). The same hard-constraint rules apply: mapped "no" → not accessible for you; anything unmapped or "limited" → call to verify. No API keys are needed.
- Real prices and insurance networks are not public, so the true-cost comparisons still use clearly labeled sample clinics.

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

- OpenStreetMap coverage and accessibility tagging vary by area; many clinics have no wheelchair tag, and exam-room access is never mapped — so most real clinics correctly land in **Call to check**.
- OSM rarely tags medical specialty. Clinics tagged with a *different* specialty are excluded; untagged clinics are included and marked as such.
- Prices are benchmark estimates, not clinic quotes. Insurer networks are not public, so network status is always "ask".
- The schematic sample clinics in `src/data/providers.ts` are used only by unit tests and the landing-page story animation.

## Run locally

Requirements: Node.js 20+.

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # 38 unit tests for the matching, cost, insurance, policy, parser, compare and gap engines
npm run build          # production build in dist/
npm run build:single   # one self-contained HTML file in dist-single/index.html (open it directly or host anywhere)
```

Optional: `cp .env.example .env.local` and add your DeepSeek API key to enable the AI buttons. Requires Node.js 20.19+ or 22.12+.

## Project structure

```
src/
  data/          accommodations catalog, real 2026 benchmarks, payer types; sample clinics for tests/story only
  lib/           pure business logic (no React): matching, cost, insurance, checklist, policy, needsParser, compare, gap, ai
  state/         localStorage-backed store, tiny hash router
  components/    Layout, ProviderCard, CostViz (charts), ProfileSections (forms), ui primitives
  pages/         Home, Onboarding, Dashboard, FindCare, ProviderDetail, Compare, CostCalculator, InsuranceNavigator, AccessMap, Plan, ProfilePage
```

## Technical stack

React 19 · TypeScript · Vite · Tailwind CSS 3 · Recharts · Leaflet + OpenStreetMap · DeepSeek AI (optional) · Lucide icons · Vitest · axe-core + Playwright for audits. No backend required.

**Design:** dark black-and-green theme (Manrope headings, Public Sans body). The landing page tells the product story as a pausable, six-scene animation driven by the real matching engine (cheapest clinic ruled out → unknown clinic flagged → accessible clinic wins on true cost → plan ready). Also: a short launch splash, staggered intro and page-transition animations, count-up figures and growing cost bars. All motion is disabled by the operating system's reduced-motion setting or the in-app "Reduce motion" switch, and every color pair passes WCAG AA contrast.

## Future improvements

- Community and clinic-submitted accessibility audits with photo evidence, verification workflows and freshness scoring.
- Real provider directories (e.g. NPI data) and price-transparency files; real geocoding and routing with paratransit service areas.
- Insurer network lookups and eligibility checks via standards-based APIs.
- Multi-visit and episode-of-care cost modeling (e.g. a course of therapy), and telehealth substitution savings.
- Shareable Access Card (QR / wallet pass), multilingual and ASL video content.
- Usability testing with disabled patients and disability organizations; screen-reader and switch-access testing beyond automated audits.

See [DEVPOST.md](DEVPOST.md) for the submission write-up and a 2–3 minute demo script.
