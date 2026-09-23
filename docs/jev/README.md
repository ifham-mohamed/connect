# JEV integration proposal

- Status: proposed
- Scope: architecture and delivery planning only
- Runtime implementation: intentionally not included

This documentation turns the ideas in
[`JEV_APPLICATION_TRACKER_INTEGRATION_CONTEXT.md`](../JEV_APPLICATION_TRACKER_INTEGRATION_CONTEXT.md)
into a plan that fits the current Jobradar repository.

## Decision summary

Jobradar will use **JEV as its only model-based decision service**. Source
collection, normalization, validation, persistence, authorization, policy, and
user-visible explanations remain ordinary deterministic application code.

The initial integration will classify already-collected jobs. It will not ask
JEV to generate prose, parse arbitrary JSON, operate the UI, apply for jobs, or
send messages. No OpenAI, Anthropic, local generative model, or generic LLM
fallback is part of this design.

The existing matcher remains authoritative during shadow rollout. JEV results
are promoted only after evaluation proves that they improve ambiguous cases
without allowing incompatible career stages into a user's relevant view.

## Documents

| Document                                            | Purpose                                                               |
| --------------------------------------------------- | --------------------------------------------------------------------- |
| [Architecture](architecture.md)                     | Boundaries, runtime flow, ownership, and repository placement         |
| [Decision contract](decision-contract.md)           | JEV state, typed questions, outputs, confidence, and failure behavior |
| [Data model](data-model.md)                         | Proposed additive PostgreSQL schema and retention rules               |
| [Development plan](development-plan.md)             | Sequenced stages, deliverables, gates, and rollback                   |
| [Evaluation and rollout](evaluation-and-rollout.md) | Gold set, metrics, shadow mode, and promotion criteria                |
| [ADR 001](adr-001-jev-only-decision-layer.md)       | Why JEV is the sole model-based decision layer                        |
| [Stage 0–1 status](stage-0-1-status.md)             | Delivered foundation and remaining live verification                  |
| [Stage 2–3 status](stage-2-3-status.md)             | Queue, shadow worker, health reporting, and live gates                |

## Source-of-truth order

When these documents disagree with another source, use this order:

1. Current database migrations and application code.
2. This repository-specific proposal.
3. Official TypeSafe documentation and the installed SDK version.
4. The original integration context, which is an idea catalogue rather than an
   implementation contract.

## Current system constraints

- Jobs are imported by adapters in `src/lib/connectors.ts` and stored by
  `src/lib/sync.ts`.
- Matches are presently rebuilt from deterministic keyword, location, work
  mode, and career-stage rules.
- Owners manage the shared source catalogue and can inspect all collected jobs.
  Members see jobs relevant to their own monitors and personal saved/applied
  state.
- Career stages are `internship`, `entry`, `mid`, `senior`, and `other`.
- Monitor work arrangements are stored per location and include on-site,
  hybrid, and remote selections.
- PostgreSQL is the durable state and coordination layer. The existing worker
  already serializes source collection with advisory locks.
- JEV credentials and calls are server-only. Personal reviews use bounded,
  selected, redacted CV evidence, never the PDF, contact fields, or complete
  raw extraction.
- Members default to five new personal job analyses per Sri Lanka calendar
  day. Reservations are atomic, cached reviews are free, failed calls release
  allowance, and owners remain unlimited.
- Owner policy changes are same-origin, persistently rate-limited, audited,
  and visible only in the signed-in owner workspace.

## Verified JEV capability and integration spike

The official TypeSafe documentation describes JEV as a System One model that
evaluates typed questions against a shared state. It exposes Choice, Score, and
Noul primitives and returns structured results; Choice and Score include
confidence. The official JavaScript SDK is `@typesafe-ai/sdk` and exposes a
`TypeSafeClient.systemOne` call.

Before production code is written, Stage 0 must pin an SDK version and verify
the exact response shape, timeout behavior, request limits, model selection,
usage metadata, and data-retention terms. Those operational details are not
treated as stable until captured from the pinned version.

References:

- [TypeSafe introduction](https://docs.typesafe.ai/introduction)
- [Official JavaScript SDK](https://github.com/TypeSafe-AI/typesafe-sdk-js)

## Explicit non-goals for the classification release

- Model-based CV parsing or storage of original CV files. The later candidate
  stage uses deterministic browser extraction and saves only user-approved
  structured data.
- Generated job summaries, cover letters, outreach, or interview answers.
- Automated applications or other external actions.
- Replacing source-specific parsers with model calls.
- Making source collection fail because JEV is unavailable.
- Provider abstraction that silently routes decisions to another model.
