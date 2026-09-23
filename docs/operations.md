# Operations

## Configuration

| Variable                 | Needed when                       | Purpose                                                                                                       |
| ------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | Always                            | PostgreSQL connection for workspace data, accounts, sessions, jobs, and intelligence results.                 |
| `DATABASE_WEB_URL`       | Optional split endpoint           | Web transaction-pool URL; falls back to `DATABASE_URL`.                                                       |
| `DATABASE_WORKER_URL`    | Optional split endpoint           | Direct/scheduled-worker URL; falls back to `DATABASE_URL`.                                                    |
| `DATABASE_POOL_MAX`      | Optional                          | Web connection-pool limit; keep low for hosted PostgreSQL.                                                    |
| `DATABASE_CA_CERT_PATH`  | Hosted database with a CA file    | Path to the provider CA certificate. The current Aiven connection uses this option.                           |
| `DATABASE_CA_CERT`       | Hosted database with an inline CA | Inline PEM alternative to `DATABASE_CA_CERT_PATH`; normally leave blank when the path is configured.          |
| `POSTGRES_PASSWORD`      | Compose-managed PostgreSQL only   | Password for the local `db` container; it does not replace credentials inside an external `DATABASE_URL`.     |
| `APP_URL`                | Always                            | Exact browser origin, for example `https://jobs.example.com`; controls same-origin writes and secure cookies. |
| `CRON_SECRET`            | `/api/cron` collection is enabled | Separate scheduler Bearer secret; use at least 24 random characters.                                          |
| `SECURITY_AUDIT_SECRET`  | Production                        | Independent 32-byte-or-longer HMAC key for non-reversible device and network identifiers.                     |
| `TRUST_PROXY_HEADERS`    | Trusted reverse proxy             | Keep `false` unless the proxy overwrites forwarded-IP headers; enable to support network attribution.         |
| `JEV_MODE`               | Optional JEV processing           | `off`, `shadow`, or `assisted`; keep `off` until the live smoke test succeeds.                                |
| `JEV_PROVIDER`           | JEV processing                    | `vercel` for AI Gateway or `typesafe` for a direct TypeSafe account.                                          |
| `AI_GATEWAY_API_KEY`     | `JEV_PROVIDER=vercel`             | Server-only Vercel AI Gateway credential.                                                                     |
| `JEV_MODEL`              | JEV processing                    | Use `typesafe-ai/jev` through Vercel AI Gateway.                                                              |
| `JEV_BASE_URL`           | Optional endpoint override        | Normally blank; the application supplies Vercel's TypeSafe-compatible endpoint.                               |
| `TYPESAFE_API_KEY`       | `JEV_PROVIDER=typesafe`           | Direct TypeSafe credential; leave blank when using Vercel.                                                    |
| `JEV_REQUEST_TIMEOUT_MS` | Optional worker tuning            | Maximum request duration.                                                                                     |
| `JEV_MAX_RETRIES`        | Optional worker tuning            | SDK retries for transient request failures.                                                                   |
| `JEV_MAX_ATTEMPTS`       | Optional worker tuning            | Durable queue attempts before dead-lettering.                                                                 |
| `JEV_BATCH_SIZE`         | Optional worker tuning            | Maximum tasks claimed by one worker cycle.                                                                    |

Keep `.env` out of version control and container build context. Set deployment variables through the host’s secret manager. Use separate random values for the scheduler and audit secrets. Only the web service needs the scheduler and audit secrets; the worker only needs its database connection and JEV credential when enabled.

Authenticated writes use persistent per-user route limits shared across web instances. Members default to five new CV-to-job analyses per Sri Lanka calendar day. Owners have no per-user daily cap, but every account remains inside the workspace monthly request/token boundary. Keep gateway paid overage and purchased credits disabled. A provider `402` or `429` pauses requests and deterministic matching continues.

## JEV shadow intelligence

JEV is isolated from collection and matching. Keep `JEV_MODE=off` until the
database migration and one live smoke request have succeeded.

Configure the local ignored `.env` file:

```text
AI_GATEWAY_API_KEY=<your Vercel AI Gateway key>
JEV_MODE=shadow
JEV_PROVIDER=vercel
JEV_MODEL=typesafe-ai/jev
JEV_REQUEST_TIMEOUT_MS=10000
JEV_MAX_RETRIES=2
JEV_MAX_ATTEMPTS=5
JEV_BATCH_SIZE=5
```

The Vercel gateway uses its TypeSafe-compatible endpoint at
`https://ai-gateway.vercel.sh/typesafe`. A direct TypeSafe account is still
supported by setting `JEV_PROVIDER=typesafe`, `TYPESAFE_API_KEY`, and an
optional `JEV_MODEL`; never interchange the two credentials.

Never place a real key in `.env.example` or commit it. Apply the additive
tables, then queue a controlled recent-job sample:

```powershell
npm run db:migrate
npm run jev:smoke
npm run jev:backfill -- --limit=25
npm run jev:worker:once
npm run jev:report
```

Run `npm run jev:worker:once` from a bounded scheduler after collection when
the owner has enabled background AI. New or materially changed jobs are queued
inside their collection transaction. There is no five-second idle worker in
the free deployment, and a provider outage cannot roll back collection.

With Compose, start the opt-in service after configuring the key:

```powershell
docker compose --profile jev up -d
```

The owner can inspect `GET /api/intelligence` while signed in. It returns queue
counts, evaluation totals, review counts, latency, token usage, deterministic
disagreements, and source-segmented totals. It never returns API keys,
descriptions, or raw provider errors.

Shadow profiles do not affect job visibility or matching. Set `JEV_MODE=off`
and stop the intelligence worker to halt calls immediately.

## First deployment

1. Create PostgreSQL and configure environment variables.
2. Apply `npm run db:migrate` before starting web traffic or collection. Migrations run in a transaction and are serialized by an advisory lock.
3. Run `npm run build` and start the web process, or use the provided image’s `web` target.
4. For a free hosted deployment, deploy `cloudflare/`, configure `JOBRADAR_URL` and `CRON_SECRET`, and verify both hourly collection and daily retention triggers. For self-hosting, Compose calls the one-shot worker hourly.
5. Verify `/api/health` returns `status: ok`; create the first owner account, verify sign-in, a successful run, and source-attributed jobs.
6. Put HTTPS in front of the app and set the matching `APP_URL`. Production writes fail closed without it. Configure `TRUST_PROXY_HEADERS=true` only after confirming the proxy replaces incoming forwarded-IP headers. Use persistent database storage, scheduled backups, and a tested restore procedure.
7. Open `/app/settings`, verify the current session, AI allowance, and security activity. Exercise session revocation from a second browser before public access.

## Observability

The worker emits timestamped source summaries. Owner Settings includes a Performance and Cost panel for database size, queue state, seven-day source totals, and workspace AI use. Activity and Connected sources show stored successes and failures. `/api/health` verifies the schema; `/api/revisions` is the lightweight client invalidation resource.

For production, configure your host’s uptime monitor and alert when:

- Web health fails repeatedly.
- An enabled source’s last successful check is older than two collection intervals.
- Consecutive collection failures grow or worker restarts repeat.
- Connection count, database storage, or response latency approaches the hosting limit.

Monitoring services and external alerts are deployment configuration, not provisioned by this repository.

## Failure recovery

- **Database unavailable:** the dashboard shows a connection error; existing database records are not replaced by sample data.
- **One source fails:** previous jobs remain; the run and source record show the error; other due sources continue.
- **Worker stopped mid-import:** PostgreSQL rolls back the open transaction. Its source lease expires after 12 minutes; the next claim marks the abandoned run failed.
- **Duplicate scheduler invocation:** each caller claims a different due source with `FOR UPDATE SKIP LOCKED`; the same source cannot be leased twice.
- **Source throttles:** keep the recorded cooldown. Do not repeatedly remove the attempt timestamp to force requests.
- **Account access issue:** an owner can remove that user’s rows from `user_sessions` to revoke active sessions before resetting credentials through an approved recovery procedure.
- **Unexpected 429:** respect `Retry-After`. Inspect `request_rate_limits`, authentication attempts, and the owner-configured AI allowance before changing a limit. Do not delete counters to bypass provider cost controls.
- **Suspicious session event:** revoke the affected session in `/app/settings`, rotate credentials and secrets if compromise is plausible, and preserve `security_events` for investigation.

## Backups and restore

Use provider-managed backups or scheduled PostgreSQL backups stored separately from the app host. Test restores to a separate database before an upgrade. The Docker named volume is persistence, not a backup. No destructive maintenance is automated.

## Focused-read and scheduler checks

- `GET /api/jobs?limit=20` returns summaries only and caps `limit` at 50.
- `GET /api/jobs/:id` loads description and personal detail on demand.
- `/api/sources`, `/api/runs`, `/api/runs/:id/jobs`, and `/api/performance` require owner access.
- `GET /api/revisions` supports `If-None-Match` and returns `304` when unchanged.
- `POST /api/cron` processes one lease and reports `moreDue`; GET returns 405.
- `POST /api/maintenance` aggregates and removes eligible history older than 90 days.
- Run `npm run perf:load` after migrations to simulate 100 focused reads and print latency, payload, pool, and query-plan evidence.

## Verification performed and limits

Automated tests cover monitor rules, unsafe input boundaries, daily/member and monthly/workspace AI limits, source validators, content identity, cursor stability, account visibility, SQL matching, source leases, scheduler recovery, and failures. SQL tests use PGlite. These tests do not replace an independent penetration test or a production-like restore exercise.

The frontend was checked through the local browser for navigation, job search, saving, monitor creation, and mobile/desktop layout. Docker was installed but its daemon was not running in the development environment, so the complete Docker stack could not be started there. Deployment credentials and a hosted database were not provided. The local app therefore opens in the explicitly labeled interactive demo.
