# CareCost — Architecture Notes

This document records architecture decisions as the implementation takes shape. Update it when the stack or major design changes.

## Initial implementation principles

- Keep the demo straightforward to run locally.
- Keep core product logic independent from UI components.
- Use a typed provider and accessibility data model.
- Make provider data provenance and verification status explicit.
- Make financial calculations deterministic, transparent, and unit-tested.
- Keep AI integrations optional; provide a deterministic demo fallback.

## Suggested logical modules

- `profile`: user location, preferences, and essential/preferred accommodations.
- `providers`: provider records, sample data, search, and provenance metadata.
- `matching`: hard-constraint filtering and explainable ranking.
- `costs`: medical responsibility estimates and additional user-entered expenses.
- `insurance`: plan inputs, policy-text explanation, and coverage caveats.
- `navigation`: personalized appointment preparation tasks.
- `ui`: accessible pages, reusable components, and visualizations.

## Provider data provenance

Each accommodation and price should carry a source/status where practical, such as `verified`, `self_reported`, `unknown`, or `synthetic`. Include a date or timestamp for verification when available.

## Matching behavior

1. Evaluate essential accommodations first.
2. Exclude only providers confirmed not to meet an essential requirement.
3. Mark unknown requirements as needing verification.
4. Rank otherwise suitable providers using user preferences such as estimated cost, travel distance, insurance compatibility, and preferred accommodations.
5. Explain the reason for the result and its uncertainty.

## Cost model

Keep cost inputs and outputs separate. At minimum, expose the medical responsibility estimate and each additional user-entered expense as separate line items. Avoid double-counting expenses. Document assumptions and test edge cases, including zero values, missing values, deductible exhaustion, and out-of-pocket caps.

## Decisions log

Add significant decisions to `DECISIONS.md` with the date, context, options considered, and rationale.
