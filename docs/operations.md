# Operations

## Configuration

| Variable            | Purpose                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`      | PostgreSQL connection. Omit entirely for the browser-only demo. Use a direct or session-pooled endpoint for this release. |
| `ADMIN_PASSWORD`    | Owner sign-in; at least 16 characters. Use a long, random value.                                                          |
| `SESSION_SECRET`    | HMAC signing key; at least 32 characters. Rotate to invalidate existing sessions.                                         |
| `CRON_SECRET`       | Separate scheduler Bearer secret; at least 24 characters.                                                                 |
| `APP_URL`           | Exact origin, for example `https://jobs.example.com`. Controls same-origin writes and secure session cookies.             |
| `POSTGRES_PASSWORD` | Compose-managed database password; use a strong URL-safe value outside local development.                                 |

Keep `.env` out of version control and container build context. Set deployment variables through the host’s secret manager. Only the web service needs owner and scheduler secrets; the worker only needs its database connection.

## First deployment

1. Create PostgreSQL and configure environment variables.
2. Apply `npm run db:migrate` before starting web traffic or collection. Migrations run in a transaction and are serialized by an advisory lock.
3. Run `npm run build` and start the web process, or use the provided image’s `web` target.
4. Start the `worker` target as a separate long-running service, or configure the protected cron endpoint. A live web app alone does not collect in the background.
5. Verify `/api/health` returns `status: ok`; verify owner sign-in, a successful run, and source-attributed jobs.
6. Put HTTPS in front of the app and set the matching `APP_URL`. Use persistent database storage, scheduled backups, and a tested restore procedure.

## Observability

The worker emits structured summaries containing timestamp, source, result, and added count. The dashboard’s Activity log and Connected sources pages show stored successes and failures. `/api/health` verifies the database schema is reachable; it does not assert source freshness or collector availability.

For production, configure your host’s uptime monitor and alert when:

- Web health fails repeatedly.
- An enabled source’s last successful check is older than two collection intervals.
- Consecutive collection failures grow or worker restarts repeat.
- Connection count, database storage, or response latency approaches the hosting limit.

Monitoring services and external alerts are deployment configuration, not provisioned by this repository.

## Failure recovery

- **Database unavailable:** the dashboard shows a connection error; existing database records are not replaced by sample data.
- **One source fails:** previous jobs remain; the run and source record show the error; other due sources continue.
- **Worker stopped mid-import:** PostgreSQL rolls back the open transaction. The connection’s lock is released. A subsequent collector marks orphaned runs failed and retries according to the recorded interval.
- **Duplicate scheduler invocation:** the second invocation sees the global lock and skips. This relies on a direct/session-mode connection.
- **Source throttles:** keep the recorded cooldown. Do not repeatedly remove the attempt timestamp to force requests.
- **Owner password changed:** also rotate `SESSION_SECRET` if existing sessions must be invalidated immediately.

## Backups and restore

Use provider-managed backups or scheduled PostgreSQL backups stored separately from the app host. Test restores to a separate database before an upgrade. The Docker named volume is persistence, not a backup. No destructive maintenance is automated.

## Verification performed and limits

Automated tests cover monitor rules, exclusions, literal skill names, unsafe URLs/XML, source date normalization, schema constraints, duplicate import identity, persistent job status, SQL monitor matching, scheduler behavior and failures. SQL tests use PGlite, a PostgreSQL engine; advisory-lock scheduling tests simulate the connection lock around real SQL transactions. These tests do not replace running Compose against a production-like PostgreSQL server.

The frontend was checked through the local browser for navigation, job search, saving, monitor creation, and mobile/desktop layout. Docker was installed but its daemon was not running in the development environment, so the complete Docker stack could not be started there. Deployment credentials and a hosted database were not provided. The local app therefore opens in the explicitly labeled interactive demo.
