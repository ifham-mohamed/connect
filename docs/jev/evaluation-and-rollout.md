# JEV evaluation and rollout

## Evaluation objective

The integration succeeds when it improves ambiguous job classification without
reducing the precision of a user's relevant view. A plausible-looking answer
is insufficient; promotion requires labeled evidence.

## Gold-set construction

Create a versioned, reviewable dataset from jobs already collected by Jobradar.
Do not include user identities or personal workflow state.

The set must include:

- every enabled source kind;
- Sri Lanka, Qatar, worldwide remote, and other active locations;
- onsite, hybrid, remote, and unstated arrangements;
- internship, entry, mid, senior, and genuinely unspecified roles;
- title forms such as junior, associate, graduate, lead, staff, manager,
  `(1)`, `I`, `(2)`, `II`, `(3)`, and `III`;
- compound traps such as “Senior Associate Engineer”;
- technology-adjacent non-jobs, malformed posts, sparse listings, duplicates,
  and expired content;
- listings where the title conflicts with description text.

Two reviewers should resolve disputed labels for high-risk fields. Store the
label rationale and evidence excerpt, not only the final label.

## Metrics

| Decision             | Primary measure                  | Required diagnostic                           |
| -------------------- | -------------------------------- | --------------------------------------------- |
| Technology relevance | precision and recall             | false positives by source                     |
| Role family          | macro F1/agreement               | confusion matrix                              |
| Career stage         | exact agreement                  | severe leakage matrix                         |
| Work arrangement     | exact agreement                  | false-remote and false-onsite rates           |
| Content quality      | precision by rejected class      | valid jobs incorrectly suppressed             |
| Policy               | coverage at accepted confidence  | abstain/review rate                           |
| Operations           | success and latency distribution | queue age, retry, quota, and dead-letter rate |

Report deterministic baseline, raw JEV answer, and post-policy result
separately. Otherwise policy gains can be mistaken for model gains.

## Non-negotiable regressions

The release gold set must contain no case where assisted policy:

- promotes an explicit senior role to internship or entry;
- promotes an explicit internship to entry, mid, or senior;
- labels an explicitly onsite role as remote;
- invents a role requirement without source evidence;
- exposes an owner-only collected job to an unauthorized member;
- changes a user's saved/applied/archive state.

A violation blocks that field from promotion regardless of aggregate score.

## Threshold calibration

Do not choose confidence thresholds from intuition. For each question:

1. Plot correctness against returned confidence on the labeled set.
2. Select an initial acceptance threshold for the required precision.
3. Reserve a review band below acceptance.
4. Treat values below review as abstentions.
5. Re-evaluate by source, career stage, and location.
6. Record the threshold with the question-set and policy version.

If confidence is not calibrated for a field, keep that field in shadow mode.

## Rollout controls

Promotion is field- and source-specific. A safe sequence is:

```text
off
  -> shadow for selected sources
  -> shadow for all sources
  -> assisted content quality
  -> assisted technology relevance
  -> assisted work arrangement
  -> assisted role family
  -> assisted career stage
```

Each transition requires an evaluation report, sampled owner review, and a
rollback drill. A field can return to shadow without disabling other fields.

## Live shadow comparison

For each job, record a non-user-visible comparison:

- deterministic classification;
- raw JEV classification and confidence;
- policy outcome;
- match ids that would be added or removed;
- conflict reason;
- source and content-quality segment.

Never log user email or raw session data. Monitor ids may be aggregated or
hashed for operational reports.

## Drift monitoring

Create a recurring reviewed sample from new jobs and alert on:

- confidence distribution shifts;
- increased abstention or malformed responses;
- source-specific disagreement changes;
- rising severe career-stage conflicts;
- sudden relevant-result count changes;
- model or SDK version changes;
- latency, quota, or queue-age degradation.

A model identifier change is a new evaluation cohort. It is not silently mixed
with the previous baseline.

## Rollback

Rollback is application policy, not data deletion:

1. Set the affected field or `JEV_MODE` to shadow/off.
2. Stop claiming new intelligence work if the incident is provider-wide.
3. Rebuild affected matches from the existing deterministic rules.
4. Preserve queue and evaluation records for diagnosis.
5. Resume only after replaying the incident fixtures and passing promotion
   gates.

Collection, authentication, saved jobs, and source-run history continue during
the rollback.

## Evaluation report template

Every promotion report should state:

- dataset version and sampling dates;
- question-set, SDK, model, and policy versions;
- per-field and per-source metrics;
- severe-regression count;
- confidence thresholds and achieved coverage;
- latency, usage, queue age, retry, and dead-letter results;
- known weak segments;
- approved rollout scope;
- rollback owner and procedure.
