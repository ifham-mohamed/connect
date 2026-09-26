# ADR 001: Use JEV as the only model-based decision layer

- Status: accepted
- Date: 2026-09-22
- Owners: Jobradar maintainers

## Context

The original JEV integration context combines JEV with an unspecified parser or
generative LLM for extraction, summaries, and CV processing. The requested
product direction is to integrate JEV without another LLM. The current Jobradar
system already has source-specific parsers, normalized job storage,
deterministic matching, authenticated owner/member views, and a PostgreSQL
worker flow.

JEV is designed for typed judgments over supplied state. It is not a general
text generator. Jobradar therefore needs an architecture that uses JEV for its
strengths without introducing an unapproved model dependency or treating
probabilistic output as executable policy.

## Decision

JEV will be Jobradar's sole model-based service.

- Deterministic code collects, parses, normalizes, validates, and stores source
  data.
- JEV answers narrow, versioned Choice, Score, or Noul questions.
- Deterministic policy validates, gates, combines, and explains those answers.
- The integration has no alternate production model provider.
- If JEV is unavailable or abstains, current deterministic behavior continues.
- Initial scope is job classification. Generated prose, CV parsing, automatic
  applications, and external messaging are excluded.

## Consequences

Benefits:

- one explicit intelligence dependency and credential boundary;
- structured outputs instead of prose parsing;
- auditable per-question confidence and policy decisions;
- source collection remains reliable during provider outages;
- current behavior supplies a clear baseline and rollback.

Costs:

- deterministic preprocessing and evidence extraction require application
  engineering;
- ambiguous fields may remain unknown instead of being filled with generated
  text;
- candidate/CV features require later product and privacy design;
- question and policy versioning become maintained domain assets.

## Rejected alternatives

### JEV plus a generative extraction model

Rejected because it violates the single-model requirement, creates a second
security and failure boundary, and makes provenance harder to audit.

### Replace existing matching immediately

Rejected because there is no measured baseline showing that JEV improves every
field and source. Shadow evaluation and staged field promotion are required.

### Call JEV inside the source transaction

Rejected because external latency or outage would block collection and hold a
database transaction open.

### Generic provider interface with silent fallback

Rejected because it makes the deployed intelligence provider ambiguous. The
JEV client boundary exists for validation and testing, not provider switching.

### Ask JEV to produce summaries and explanations

Rejected because JEV returns typed decisions, and explanations can be assembled
reliably from persisted facts and evidence.

## Revisit conditions

Revisit this ADR only if the product requirement changes explicitly, JEV no
longer provides the required typed-decision capability, or measured evaluation
shows that the proposed decisions cannot meet the promotion gates. A change
requires a new ADR rather than silently adding another provider.

## 2026-09-23 implementation note

The later private candidate stage was approved without adding another model.
CV and vacancy-image extraction is deterministic and browser-side; Jobradar
sends JEV only bounded, selected, redacted evidence for an explicit personal
review. Per-user persistence, daily member allowances, same-origin writes,
persistent route throttling, and audit events preserve the original decision's
single-provider and controlled-policy boundaries.
