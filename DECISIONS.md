# CareCost — Decisions Log

Record important product and engineering decisions here so ChatGPT, Claude Code, and human contributors work from the same assumptions.

## Initial decisions

### Essential accessibility requirements are hard constraints
- **Decision:** A provider that is confirmed not to satisfy an essential accommodation must not be recommended as a suitable match merely because it is cheaper.
- **Reason:** Accessibility is a core requirement of the product, not a cosmetic ranking factor.

### Unknown information stays unknown
- **Decision:** Missing accommodation data is shown as needing verification, not as accessible or inaccessible.
- **Reason:** The application must not make unsupported claims about real providers.

### Cost estimates are transparent
- **Decision:** Show each cost component and the assumptions behind calculations.
- **Reason:** Users need to understand and challenge estimates, not receive an unexplained score.

### Synthetic demo data is labeled
- **Decision:** Fictional providers and prices must be clearly identified as demonstration data.
- **Reason:** The prototype must not mislead users or judges into believing unverified claims are real.
