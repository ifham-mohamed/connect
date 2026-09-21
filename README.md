# Jobradar

A working first release of a job-monitoring workspace for **Sri Lanka and remote technology jobs**. Collect public job listings, follow keywords, preserve source records, and manage a shortlist.

## What is included

- Responsive dashboard with search, location/source/monitor filters, sorting, CSV export, and job details.
- Keyword monitors with case-insensitive whole-term matching, exclusions, location, remote-only rules, editing, pausing, and deletion.
- Monitor-powered LinkedIn Jobs discovery with position, keyword, location, work arrangement, experience, job type, and posting-date filters.
- LinkedIn discovery paths for jobs in your network and job-related member posts, plus focused Sri Lanka and Qatar software-role monitors.
- LinkedIn refinements for relevance or recency, search radius, Easy Apply, and lower-applicant opportunities, with early-career and remote monitor presets.
- A separate LinkedIn member-post search for Sri Lankan hiring signals, Qatar posts from first-degree connections, and global remote opportunities.
- Saved, applied, and archived job states stored in PostgreSQL in live mode.
- Collectors for **ITPro.lk RSS, Remotive, Lever, Greenhouse, and Arbeitnow**. ITPro.lk, Remotive, and Dijital Team’s Lever board are seeded by the migration.
- Source-specific identifiers, original URLs and source attribution; publication, first discovery, and last observation timestamps.
- Idempotent imports; previously saved/application states survive re-imports.
- Source health, run history, timeouts, response-size limits, per-source scheduling, and an advisory lock preventing overlapping collectors.
- Password-protected owner actions and signed, expiring, HTTP-only sessions. Public listings remain readable without signup.
- Docker Compose setup, a standalone worker, and a protected endpoint for external schedulers.

This is a **single shared workspace**, not a multi-tenant recruiting SaaS. Sample mode is clearly labeled and does not run collectors or imply that its illustrative openings are real.

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
| A separate Node worker           | Collection runs independently of browser traffic. No always-open browser or request-triggered scraping is necessary.                                                    |
| Vitest + PGlite                  | Fast unit tests and SQL integration tests using PostgreSQL compiled to WebAssembly. The production database remains regular PostgreSQL.                                 |

The implementation deliberately starts as a **modular monolith with a separate collector process**. Redis, Kubernetes, Elasticsearch, and microservices add operational work that this release does not need. See [architecture and scaling](docs/architecture.md) for the expansion path and current limits.

## Run the interactive preview

Requirements: Node.js 24 LTS and npm.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). With no `DATABASE_URL`, the app uses clearly labeled sample data. Monitor, source, and job-status changes persist in this browser’s local storage. Demo changes are not imported into the live database.

## Start the complete system with Docker

1. Install/start Docker Desktop or Docker Engine with Compose.
2. Copy `.env.example` to `.env`.
3. Replace `ADMIN_PASSWORD`, `SESSION_SECRET`, and `CRON_SECRET` with different random values. The owner password must be at least 16 characters; the session secret at least 32; the cron secret at least 24. Generate each independently with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

4. Set `POSTGRES_PASSWORD` to a separate random alphanumeric database password. The local default is only for development. Use URL-safe characters, or percent-encode the password in a manual `DATABASE_URL`.
5. Start everything:

```sh
docker compose up --build -d
```

Compose starts PostgreSQL, applies the migration once, then starts the web app and scheduled worker. Open [localhost:3000](http://localhost:3000). Sign in through **Workspace settings** to manage the workspace. The worker starts its first collection automatically.

```sh
docker compose logs -f worker
docker compose logs web
docker compose down
```

The named PostgreSQL volume persists after `docker compose down`. Do not use `down -v` unless you intend to delete the database.

## Develop with PostgreSQL

### Aiven configuration

The local `.env` is prepared with the supplied Aiven connection URL and a placeholder password. Replace that password with the real service password, URL-encoding special characters, and confirm the hostname in the Aiven console. The originally supplied hostname failed DNS resolution during verification. App authentication secrets have been generated locally; the workspace owner password is `ADMIN_PASSWORD` in `.env`.

Remote database connections verify TLS certificates. If the service uses an Aiven private CA, download its CA certificate from the service console and set `DATABASE_CA_CERT_PATH` to its local path, or provide the PEM in `DATABASE_CA_CERT`. For containers, use the PEM environment variable, because a Windows certificate path is not available inside the container.

```sh
npm run db:check
npm run db:migrate
npm run sync
npm run dev
# In another terminal, for ongoing monitoring:
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

The scripts load `.env`; Next.js also loads it. Alternatively, use `npm run sync` for one check of due sources. Repeated manual checks respect the same intervals as the worker.

Database configuration lives in `.env`; credentials are never sent to the client. Use TLS connection parameters supplied by your managed database provider. Do not disable certificate verification.

## Deployment choices

**Simplest consistent setup:** deploy the Compose stack on a small server, with an HTTPS reverse proxy and managed backups. Alternatively, run the web and worker containers on a managed container platform and use its managed PostgreSQL offering. The web image uses Next.js standalone output and runs as an unprivileged user.

**Vercel + managed PostgreSQL:** deploy the Next.js application, set all environment variables, set `APP_URL` to the exact HTTPS origin, and apply migrations from a trusted terminal before opening the app. `vercel.json` schedules `/api/cron` every six hours; confirm your Vercel plan supports this frequency and function duration. Vercel sends `CRON_SECRET` as a Bearer token. With this schedule, hourly sources are effectively checked every six hours; change the schedule on a supported plan or run the separate worker for hourly checks. Do not run a worker inside a web request.

**Important pooling requirement:** collection uses a session-level PostgreSQL advisory lock. The worker and `/api/cron` must connect through a **direct database endpoint or session-mode pool**, not a PgBouncer transaction-mode endpoint. This release uses one `DATABASE_URL`; use a direct connection with a conservative pool size, or split web/worker connection configuration before adopting transaction pooling.

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
npm run start
```

The optional `npx tsx scripts/check-sources.ts` makes real requests to the three seeded feeds and prints compact normalization results. It is a manual smoke check, not a recurring CI test; follow source request limits.

`GET /api/health` reports `ok`, `demo`, or `unavailable`. A database configured incorrectly produces a visible connection error rather than silently showing sample data.

## Reading guide

- [System architecture and scaling](docs/architecture.md)
- [Source references and integration decisions](docs/sources.md)
- [Operations and deployment checklist](docs/operations.md)

## Current boundaries

The browser loads the newest 1,000 records and exports its filtered selection. Older records remain in PostgreSQL. Source counts cover all stored records; dashboard counts cover the loaded window. Monitor matches are rebuilt transactionally after imports and rule changes; this is appropriate for a small workspace, not millions of postings. The application has no email/push alerts, multi-user accounts, historical job-version snapshots, automatic closure verification, or full-feed pagination yet. No claims of those features are made by the UI. Scale those pieces using the documented milestones when real usage warrants it.
