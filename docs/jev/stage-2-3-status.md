# Stage 2 and Stage 3 implementation status

Date: 2026-09-22

## Delivered

### Stage 2 — persistence and worker

- Additive migration `018_job_intelligence` with a durable queue, append-only
  evaluations, and current shadow profiles.
- Content-hash and question-version idempotency.
- Stale-task protection when a job changes while an evaluation is running.
- PostgreSQL task claims using `FOR UPDATE SKIP LOCKED` and recoverable leases.
- Separate JEV worker with bounded batches, SDK retries, capped queue backoff,
  maximum attempts, and dead-letter status.
- Stable error categories without raw provider errors or job text.
- Strict response validation before any evaluation is saved.
- Per-question confidence, model, request id, latency, and token usage audit.
- Fake-transport and PostgreSQL integration tests.

### Stage 3 — shadow tooling

- New and materially changed jobs enqueue only when `JEV_MODE` is `shadow` or
  `assisted`.
- Controlled newest-first backfill with a required limit.
- Shadow profiles and review flags that are not read by matching queries.
- Owner-only `GET /api/intelligence` health endpoint.
- CLI health report with queue, review, latency, usage, disagreement, and
  source-segmented counts.
- Offline operation remains the default; source collection does not call JEV.

## Pending live gates

Stage 3 code is ready, but production shadow rollout is not complete until:

1. `TYPESAFE_API_KEY` is restored in the ignored `.env` file.
2. `npm run jev:smoke` succeeds against the real TypeSafe account.
3. The account's quota and retention terms are recorded.
4. A 25-job backfill is reviewed before increasing the limit.
5. Confidence distributions and source disagreements are reviewed.
6. Rollback is exercised by stopping the worker and setting `JEV_MODE=off`.

No live confidence threshold is configured and no JEV field can affect matching.

## Latest local verification

- Migration `018_job_intelligence` was applied successfully to the configured
  Aiven database with certificate verification enabled.
- The empty shadow report returned zero queued tasks and zero evaluations, as
  expected before backfill.
- The live smoke request reached TypeSafe but returned HTTP 401. Replace the
  local key from the [TypeSafe console](https://console.typesafe.ai), rerun
  `npm run jev:smoke`, and enable shadow mode only after it succeeds.

## Verification sequence

```powershell
npm run db:migrate
npm run jev:verify
npm run jev:smoke
```

After the smoke call, set `JEV_MODE=shadow` in `.env` and run:

```powershell
npm run jev:backfill -- --limit=25
npm run jev:worker:once
npm run jev:report
```

While signed in as the owner, open
`http://localhost:3000/api/intelligence`. Queue items should move from
`pending` to `succeeded`, and evaluations should increase. `review` identifies
conflicts such as a JEV early-career answer against an explicit senior title.

Open the ordinary dashboard and confirm that relevant, unreviewed, saved, and
applied jobs are unchanged. Shadow data must not alter those counts.

## Failure checks

- Stop the intelligence worker: collection must continue and pending queue
  items must remain durable.
- Use `JEV_MODE=off`: collection must stop enqueueing new intelligence work.
- Temporarily use an invalid key only in a disposable local test: the worker
  must mark the task `dead` with `authentication`, without repeated requests.
- Change a queued job before processing: the old task must become `stale` and a
  new content version must be queued.
- Run the same backfill twice: the second run must queue zero duplicate tasks.
