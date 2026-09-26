# Jobradar

A working first release of a job-monitoring workspace for **Sri Lanka and remote technology jobs**. Collect public job listings, follow keywords, preserve source records, and manage a shortlist.

## What is included

- Responsive dashboard with search, location/source/monitor filters, sorting, CSV export, and job details.
- Keyword monitors with case-insensitive whole-term matching, exclusions, location, remote-only rules, editing, pausing, and deletion.
- Monitor-powered LinkedIn Jobs discovery with position, keyword, location, work arrangement, experience, job type, and posting-date filters.
- LinkedIn discovery paths for jobs in your network and job-related member posts, plus focused Sri Lanka and Qatar software-role monitors.
- LinkedIn refinements for relevance or recency, search radius, Easy Apply, and lower-applicant opportunities, with early-career and remote monitor presets.
- A separate LinkedIn member-post search for Sri Lankan hiring signals, Qatar posts from first-degree connections, and global remote opportunities.
- Per-account saved, applied, archived, and reviewed job states stored in PostgreSQL in live mode.
- Collectors for **ITPro.lk RSS, Remotive, Lever, Greenhouse, and Arbeitnow**. ITPro.lk, Remotive, and Dijital Team’s Lever board are seeded by the migration.
- Source-specific identifiers, original URLs and source attribution; publication, first discovery, and last observation timestamps.
- Idempotent imports; previously saved/application states survive re-imports.
- Source health, compact run history, conditional HTTP requests, response-size limits, and atomic per-source leases that prevent duplicate collectors.
- Per-run result history linking each successful source check to the jobs it found and the listings first discovered in that run.
- Private account access with scrypt-hashed passwords, expiring database sessions, HTTP-only cookies, and owner/member authorization.
- Privacy-safe security activity, individual session revocation, strict same-origin writes, streamed request-size enforcement, and PostgreSQL-backed write throttling.
- Personal JEV job reviews with compatible role-family matching, explicit career-level checks, merged dated experience, complete detected-skill comparison, evidence completeness, and a configurable member allowance of five new analyses per Sri Lanka calendar day.
- Focused cursor APIs, server-rendered first pages, 15-minute visibility-aware revision checks, and on-demand job/run detail reads instead of a 1,000-job dashboard response.
- Guided first-run onboarding that creates editable, user-owned monitors from career stage, role, location, and work-arrangement preferences.
- Docker Compose setup, a standalone worker, and a protected endpoint for external schedulers.

This is a **single shared source catalog**, not a multi-tenant recruiting SaaS. Every live dashboard request requires an account. Owners manage sources and can review the full collection. Members receive jobs matched to their monitors. Monitor rules, matches, review state, shortlists, applications, archives, and preference profiles belong to each account.

Personal review uses the versioned `cv-fit-v4` contract. The displayed
percentage measures evidence in the approved CV against explicit listing
requirements; it is not a hiring probability. Sparse listings show an
insufficient-detail state, and image-only listings must be extracted and
approved locally in the member's browser before JEV analysis is enabled.

## Technology choices

| Technology                       | Why it is used                                                                                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js 16 App Router + React 19 | One application for the dashboard and HTTP backend; straightforward Node/container or Vercel deployment. Route handlers handle writes, reads, and scheduled collection. |
| TypeScript                       | Shared job, source, and monitor types across UI, connectors, and backend.                                                                                               |
| PostgreSQL                       | Durable records, unique constraints for import identity, transactions, indexes, and advisory locks. It also stores run history and monitor matches.                     |
| `pg` with parameterized SQL      | A small database dependency with transparent SQL and no ORM generation/build step. Versioned SQL migrations make database behavior explicit.                            |
| Tailwind CSS 4 + design tokens   | Established styling tooling with a cohesive custom dashboard style; plain semantic components keep the UI lightweight.                                                  |
| Lucide React                     | Consistent, accessible interface icons.                                                                                                                                 |
| Zod                              | Validates owner inputs and structured upstream feeds before they reach storage.                                                                                         |
| Scheduled Node/Cloudflare runner | Hourly collection runs independently of browser traffic and claims one source through a PostgreSQL lease.                                                               |
| Vitest + PGlite                  | Fast unit tests and SQL integration tests using PostgreSQL compiled to WebAssembly. The production database remains regular PostgreSQL.                                 |

The implementation deliberately starts as a **modular monolith with a separate collector process**. Redis, Kubernetes, Elasticsearch, and microservices add operational work that this release does not need. See [architecture and scaling](docs/architecture/system.md) for the expansion path and current limits.

## Run the interactive preview

Requirements: Node.js 24 LTS and npm.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). PostgreSQL is required for accounts and live workspace data. Apply the migrations, then create the first account; it becomes the workspace owner.

The public overview lives at `/`, account access lives at `/auth`, and the signed-in workspace uses `/app/*` routes such as `/app/dashboard`, `/app/jobs`, and `/app/saved`. Previous top-level workspace URLs redirect to their new `/app/*` locations.

## Start the complete system with Docker

1. Install/start Docker Desktop or Docker Engine with Compose.
2. Copy `.env.example` to `.env`.
3. Replace `CRON_SECRET` with a random value of at least 24 characters. Generate one with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Generate a separate value for `SECURITY_AUDIT_SECRET`; do not reuse the cron or database credential. Set `APP_URL` to the exact browser origin. Leave `TRUST_PROXY_HEADERS=false` unless an HTTPS proxy you control overwrites forwarded-IP headers.

4. Set `POSTGRES_PASSWORD` to a separate random alphanumeric database password. The local default is only for development. Use URL-safe characters, or percent-encode the password in a manual `DATABASE_URL`.
5. Start everything:

```sh
docker compose up --build -d
```

Compose starts PostgreSQL, applies the migration once, then starts the web app and scheduled worker. Open [localhost:3000](http://localhost:3000) and create the first account to become the workspace owner. The worker starts its first collection automatically.

```sh
docker compose logs -f worker
docker compose logs web
docker compose down
```

The named PostgreSQL volume persists after `docker compose down`. Do not use `down -v` unless you intend to delete the database.

## Develop with PostgreSQL

### Aiven configuration

The local `.env` is prepared with the supplied Aiven connection URL and a placeholder password. Replace that password with the real service password, URL-encoding special characters, and confirm the hostname in the Aiven console. User passwords are hashed in PostgreSQL and session cookies contain only random opaque tokens.

Remote database connections verify TLS certificates. If the service uses an Aiven private CA, paste the complete PEM certificate into `DATABASE_CA_CERT` in Vercel (literal newlines or escaped `\\n` are accepted). Use `DATABASE_CA_CERT_PATH` only when the file exists in the deployed runtime; a Windows path from the development machine is not available in Vercel.

```sh
npm run db:check
npm run db:migrate
npm run sync
npm run dev
# Run one due-source drain locally:
npm run worker
```

For containers using Aiven, run `docker compose -f compose.aiven.yaml up --build -d`. This separate configuration uses `.env` for all database connections and does not start or substitute a local database. The original `compose.yaml` remains the local PostgreSQL option. No migration or import can run successfully while credentials remain placeholders.

You may use local PostgreSQL or a managed PostgreSQL service.

```sh
# After configuring .env and starting PostgreSQL:
npm run db:migrate
npm run dev
# In a separate terminal:
npm run worker
```

The scripts load `.env`; Next.js also loads it. `npm run sync` drains currently due sources once and exits. Compose invokes it hourly; hosted free deployments use the Cloudflare scheduler in `cloudflare/`.

Database configuration lives in `.env`; credentials are never sent to the client. Use TLS connection parameters supplied by your managed database provider. Do not disable certificate verification.

## Deployment choices

**Simplest consistent setup:** deploy the Compose stack on a small server, with an HTTPS reverse proxy and managed backups. Alternatively, run the web and worker containers on a managed container platform and use its managed PostgreSQL offering. The web image uses Next.js standalone output and runs as an unprivileged user.

**Vercel + Aiven + Cloudflare:** deploy the Next.js application, apply migrations, then deploy `cloudflare/` with `JOBRADAR_URL` and the same `CRON_SECRET`. Its hourly trigger calls the protected POST scheduler until due leases are drained; its daily trigger applies retention. No Vercel cron is required.

`DATABASE_POOL_MAX=1` protects the free database connection limit. `DATABASE_WEB_URL` and `DATABASE_WORKER_URL` can later point to separate pooled/direct endpoints; both fall back to `DATABASE_URL` today.

Do not enable both schedulers unnecessarily. Overlap is guarded, but one scheduler is easier to operate. Hosted services may require paid plans; this repository does not provision accounts, publish the app, or incur hosting charges.

## Source behavior

| Source     | Scope                            | Default interval | Details                                                                                                                                  |
| ---------- | -------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| ITPro.lk   | Sri Lankan tech roles            | 1 hour           | Public RSS, including original publication timezone, company, location and job type.                                                     |
| Remotive   | Remote roles worldwide           | 6 hours          | Public feed is delayed by 24 hours; location eligibility is retained. Attribution and original Remotive links are displayed.             |
| Lever      | One employer per connection      | 1 hour           | Requires the employer’s board slug; Dijital Team is seeded for Sri Lanka coverage. Publication dates are left unknown when not supplied. |
| Greenhouse | One employer per connection      | 1 hour           | Requires the employer’s board token. `updated_at` is intentionally not treated as an original publication date.                          |
| Arbeitnow  | Latest page of European listings | 6 hours          | Optional; not seeded for the Sri Lanka focus. This is recent-page monitoring, not a full historical import.                              |

These are supported collected sources, not a claim to cover every vacancy or rank every job site. LinkedIn discovery opens LinkedIn’s own Jobs search from a selected monitor; LinkedIn listings are not scraped, copied, or counted as collected records. Add imported sources only through a documented feed, licensed API, or authorized integration. Source access and terms can change; inspect the source-health page if a connector starts failing.

Remote means the source labels a job as remote. It does **not** mean someone in Sri Lanka is eligible. Original restrictions are shown. The technology filter is a title/tag heuristic; it may miss roles or include ambiguous engineering titles.

Listings absent from a partial feed are retained rather than automatically declared closed. The UI shows the last observation time and asks users to verify availability at the original source. A source failure never deletes previously collected jobs.

## Commands and verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run perf:load
npm run start
```

The optional `npx tsx scripts/check-sources.ts` makes real requests to the three seeded feeds and prints compact normalization results. It is a manual smoke check, not a recurring CI test; follow source request limits.

`GET /api/health` reports `ok`, `demo`, or `unavailable`. A database configured incorrectly produces a visible connection error rather than silently showing sample data.

## Reading guide

Documentation is organized by subject under five folders. Each document has one
canonical location; historical status reports describe their recorded stage, not
the current verification result.

- [System architecture and scaling](docs/architecture/system.md)
- [Platform API and source integrations](docs/api/source-integrations.md)
- [Operations and deployment checklist](docs/operations/runbook.md)
- [Cost and capacity guide](docs/operations/cost-and-capacity.md)
- [Security controls, findings, and residual risks](docs/security/security-audit.md)
- [JEV architecture, decisions, and document directory](docs/architecture/jev-overview.md)
- [JEV decision API contract](docs/api/jev-decision-contract.md)
- [Platform data model and JEV extension](docs/database/jev-data-model.md)
- [Shared development workflow](docs/operations/agent-workflow.md)

## Current boundaries

Job reads return 20 summaries by default and never more than 50. Each response also returns the total for the active database filters, while cursor pagination loads further records without sending descriptions. This keeps overview, relevant, collected, shortlist, applied, archived, range, and page counts accurate without downloading the full dataset. Descriptions and personal reviews load on demand. The application is designed for roughly 100 near-term users on the documented free-tier capacity. It has no MFA/passkey or password-reset flow, email/push alerts, organization workspaces, historical job-version snapshots, or automatic closure verification. Review the security audit and [cost and capacity guide](docs/operations/cost-and-capacity.md) before public deployment.
