# Architecture context

Read [the architecture authority](../../docs/architecture/system.md) for module and data boundaries and [the JEV decision](../../docs/architecture/adr-001-jev-only-decision-layer.md) before changing intelligence behavior.

HTTP parsing, authorization, rate limiting and response mapping stay in route handlers. Action operations own SQL and their transaction boundaries. Matching persistence accepts a query client and does not import collection or UI. Dashboard views receive typed data and callbacks; the container owns shared loading, polling, filtering and mutations.

Record consequential new decisions in `.agent/memory/decisions/`; link existing decisions rather than copying them.

The system guide includes context, actors/processes, components, core flows and deployment boundaries in one canonical file. The API and database guides include the non-JEV foundation. Do not interpret optional intelligence documentation as the complete platform architecture.
