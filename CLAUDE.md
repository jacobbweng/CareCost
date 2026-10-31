# Claude Code Instructions — CareCost

Before making changes:
1. Read `README.md` and `PROJECT_CONTEXT.md`.
2. Inspect the existing repository, package scripts, dependencies, and current implementation.
3. Preserve working functionality and follow the existing conventions unless there is a clear reason to change them.
4. Check `TODO.md` and update it as work progresses.

## Product requirements

- The hackathon theme is: **Accessibility tools for navigating the medical care system for disabled users.**
- CareCost helps users find providers that meet their accessibility requirements while understanding the estimated total cost of accessing care.
- Essential accessibility requirements are hard constraints. Never trade them away for a cheaper provider.
- Unknown accessibility data must remain unknown and must not be treated as confirmed accessible or inaccessible.
- Clearly label synthetic demo providers, prices, and insurance information.
- Cost outputs are estimates and must show assumptions.
- Do not require diagnosis disclosure. Let users specify accommodations directly.
- The product itself must support keyboard access, semantic markup, visible focus, accessible labels, clear validation, adequate contrast, and a non-map alternative.

## Engineering expectations

- Do not stop after creating a landing page or static mockup. Implement the primary end-to-end journey.
- Keep matching, ranking, and cost calculations in deterministic, testable functions.
- Use AI only where it adds value, such as explaining policy text or generating plain-language checklists. Do not rely on an LLM for arithmetic or hard accessibility constraints.
- Keep core demo functionality usable without paid API keys.
- Never fabricate integrations or claim synthetic information is real.
- Never commit secrets, API keys, tokens, or personal health information.
- Add or update tests for important logic and edge cases.
- Use clear component boundaries and avoid unnecessary dependencies.

## Working process

1. State a short implementation plan for substantial tasks.
2. Implement in small, coherent steps.
3. Run relevant tests, linting, and build commands available in the repository.
4. Fix issues introduced by your changes.
5. Update `TODO.md` and documentation when behavior or setup changes.
6. At the end, summarize files changed, tests run, results, and remaining limitations.

Do not overwrite or delete existing user work without checking it first.
