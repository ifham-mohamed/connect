# Stage 0 and Stage 1 implementation status

Date: 2026-09-22

## Delivered

### Stage 0 foundation

- Pinned `@typesafe-ai/sdk` version `0.6.0`.
- Confirmed the SDK's typed `systemOne` request, Choice and Noul response
  shapes, model/usage metadata, request id, timeouts, and retry configuration.
- Added server-side configuration validation with JEV disabled by default.
- Added a server-only client boundary with provider body logging disabled.
- Added an SDK contract test using a local fake HTTP transport. Tests never
  make an accidental network request.
- Added a one-fixture live smoke command for use after configuring a TypeSafe
  API key.

### Stage 1 foundation

- Added versioned `job-classification-v1` questions for technology relevance,
  role family, career stage, work arrangement, and content quality.
- Added strict runtime validation for labels, confidence, token usage, and
  complete probability distributions.
- Added bounded, plain-text state construction and stable SHA-256 identity.
- Reused Jobradar's deterministic stage and work-mode signals in JEV state.
- Added shadow-only conflict policy. No answer can affect matching at this
  stage, and explicit deterministic career-stage conflicts are sent to review.
- Added a 14-case synthetic seed set covering all 11 supported source kinds,
  all career stages, numbered/Roman levels, compound titles, remote/hybrid,
  non-technology roles, sparse content, and malformed content.
- Added an offline baseline report and optional live JEV evaluation report.

## Intentionally incomplete gates

These require a TypeSafe API key and human review and therefore cannot be
claimed as complete by automated local tests:

1. Run a real JEV smoke request and record the returned model, request id,
   latency, and token usage.
2. Review and approve the question wording and expected labels.
3. Replace or supplement synthetic fixtures with a redacted, representative
   sample of real collected jobs.
4. Run the live evaluation set and calibrate per-question confidence thresholds.
5. Document the account's production quota and TypeSafe data-retention terms.

Until those gates pass, policy returns `shadow_only` for non-conflicting JEV
answers and `review` for conflicts. There is no assisted matching.

## Commands

Offline verification, with no API key and no network call:

```powershell
npm run jev:verify
```

One live fixture after setting `TYPESAFE_API_KEY` locally:

```powershell
npm run jev:smoke
```

Full live seed evaluation:

```powershell
npm run jev:evaluate
```

The live commands print structured decisions, correctness by field, model,
request id, latency, and usage. They do not change jobs, monitors, matches, or
database state.

## What to review manually

Open these files during review:

- `src/lib/jev/questions/job-classification-v1.ts`: approve the exact questions
  and option definitions.
- `tests/fixtures/jev-job-gold.json`: approve each expected label.
- the `npm run jev:verify` output: examine known baseline gaps, especially
  hybrid arrangements stated only in descriptions and compound titles such as
  “Associate Technical Product Manager.”

Those gaps are useful evaluation cases. Stage 1 does not change the existing
matcher to make the baseline appear better.
