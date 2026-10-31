# CareCost — Project Context

## One-sentence description

CareCost is an AI-powered, disability-aware healthcare navigation platform that helps people with disabilities identify providers that accommodate their needs while understanding and comparing the total estimated financial burden of receiving care.

## Hackathon prompt

**Accessibility tools for navigating the medical care system for disabled users.**

Projects are evaluated on practicality/relevance, creativity/innovation, significance, and technical complexity.

## Product question

**Where can I receive healthcare that accommodates my disability without creating unnecessary financial strain?**

## Target users

People with disabilities who encounter accessibility, financial, insurance, transportation, communication, sensory, or cognitive barriers when navigating healthcare.

Users must be able to select accommodations directly. Do not require diagnosis disclosure or assume that all people with the same diagnosis have the same needs.

## Product principles

1. Essential accessibility requirements are hard constraints, not preferences that can be traded away for a lower price.
2. Unknown accessibility information is not proof of accessibility or inaccessibility. Display it as unknown or requiring verification.
3. Distinguish verified information, self-reported information, unknown information, and synthetic demo data.
4. Show the assumptions behind cost estimates.
5. Avoid penalizing users financially for having a disability or needing accommodations.
6. Protect user privacy and minimize sensitive data collection.
7. Make the application itself accessible, with keyboard and screen-reader support and an alternative to map-only navigation.

## Core product capabilities

### 1. Accessibility profile

Collect location, requested specialty, optional insurance details, budget preferences, and individual accessibility requirements. Let users classify each accommodation as essential or preferred. Make the profile editable.

Example accommodation categories include mobility, hearing, vision, sensory, communication, and cognitive support. Use concrete accommodation choices rather than requiring a diagnosis.

### 2. Accessibility-aware provider matching

Filter out providers only when reliable information confirms they do not meet an essential requirement. Separate providers into:
- Meets requirements
- Does not meet requirements
- Needs verification

Rank suitable candidates using affordability, distance, insurance compatibility, and preferred accommodations. Explain each recommendation and its data limitations. If no provider is confirmed to meet all essential requirements, say so clearly rather than silently relaxing constraints.

### 3. True Cost Calculator

Estimate total access cost using transparent components:

`total estimated cost = estimated patient medical responsibility + transportation + assistance + parking + other user-entered expenses`

Do not assume that every disabled user incurs every category. Let users enter, change, or omit these expenses.

For a deductible/coinsurance estimate:
- `deductible portion = min(allowed amount, remaining deductible)`
- `post-deductible amount = allowed amount - deductible portion`
- `estimated responsibility = deductible portion + post-deductible amount * coinsurance rate`
- Cap covered in-network responsibility at the remaining out-of-pocket maximum when the inputs and policy assumptions support that calculation.

Also support a fixed copayment scenario. Explain that real claims can depend on network status, service classification, exclusions, prior authorization, plan rules, and insurer processing. Label results as estimates, not guarantees.

### 4. Insurance navigator

Allow manual entry or sample-policy exploration. Explain pasted policy language in plain language, identify possible requirements or missing information, and suggest questions to ask the insurer. Never claim to verify coverage or predict an insurer's decision without authoritative evidence.

### 5. Provider discovery and comparison

Support search by specialty, area, accessibility requirements, insurance, and cost. Compare providers side by side. If a map is included, provide a fully usable accessible list view too.

### 6. Personalized navigation checklist

Generate practical before/during/after appointment tasks based on the user's stated needs. Avoid presenting generic checklists as individualized unless they use the profile.

## Primary hackathon demonstration

Use a fictional wheelchair user looking for an affordable specialist. They specify wheelchair-accessible entrance and examination room as essential requirements, enter insurance and budget preferences, compare fictional providers, see a lower-priced but unconfirmed/inaccessible option distinguished from a provider that meets the requirements, review the estimated total costs, and receive a preparation checklist.

The demo dataset must be prominently labeled fictional/synthetic. Include at least 8–12 varied fictional providers if feasible, with different specialties, prices, insurance statuses, accommodation attributes, and verification states.

## MVP priorities

1. Functional accessibility profile.
2. Functional provider matching with essential constraints and unknown data handling.
3. Functional True Cost Calculator with transparent assumptions.
4. Provider comparison.
5. Personalized checklist.
6. Insurance document explanation as a sample/demo feature if no AI service is configured.
7. Map as a stretch feature; never make the map the only discovery interface.

## Technical expectations

- Inspect the existing repository before changing its structure.
- Prefer a maintainable, modular implementation and strong TypeScript typing if using TypeScript.
- Keep core matching and cost calculations deterministic and testable.
- AI should support explanation and language tasks, not replace transparent calculations or hard accessibility constraints.
- Core demo functionality must work without paid API keys.
- Never commit secrets. Keep `.env.example` free of real credentials.
- Add tests for matching edge cases and financial calculations.

## Non-goals

- Medical diagnosis or treatment recommendations.
- Guaranteed insurance coverage determinations.
- Fabricated real-world provider data or accessibility claims.
- Replacing professional insurance, billing, or medical advice.

## Definition of done for the MVP

A judge can complete the primary demonstration without an API key, understand why providers were matched or excluded, see unknown accessibility information clearly, change cost inputs and see recalculated totals, compare at least two providers, and complete a personalized care-navigation checklist.
