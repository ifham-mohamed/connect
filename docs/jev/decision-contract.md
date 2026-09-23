# JEV decision contract

## Contract principles

1. Every question is atomic and versioned.
2. Answers are validated before persistence or policy use.
3. JEV output is evidence for application policy, not policy itself.
4. Low confidence produces abstention or review, never an optimistic match.
5. User-visible explanations are assembled from structured facts by Jobradar.
6. A contract change creates a new question-set version and a new evaluation.

## Stage 1 question set

One request evaluates a shared job state with independent typed questions.

| Key                | Primitive | Allowed result                                                                                               | Purpose                                                  |
| ------------------ | --------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `isTechnologyRole` | Noul      | probability 0–1                                                                                              | Is the primary job a technology role?                    |
| `roleFamily`       | Choice    | software, frontend, backend, full-stack, data, infrastructure, security, QA, design, product, support, other | Broad family for monitor comparison                      |
| `careerStage`      | Choice    | internship, entry, mid, senior, unclear                                                                      | Interpret title and description together                 |
| `workArrangement`  | Choice    | onsite, hybrid, remote, unclear                                                                              | Resolve stated arrangement; location stays deterministic |
| `contentQuality`   | Choice    | usable, sparse, malformed, non-job                                                                           | Prevent low-quality text from influencing matching       |

The implementation wording and options are stored in
`job-classification-v1.ts` and covered by snapshot tests. Questions should ask
only for a judgment that can be made from the supplied state. Multi-factor
ranking stays in application code.

## Career-stage compatibility

JEV's `unclear` is an abstention value. It is not written into the current
application preference enum. Materialization maps only approved answers to the
existing values:

| JEV answer                    | Jobradar profile                |
| ----------------------------- | ------------------------------- |
| internship                    | internship                      |
| entry                         | entry                           |
| mid                           | mid                             |
| senior                        | senior                          |
| unclear or rejected by policy | other, with `needs_review=true` |

Explicit deterministic signals remain hard guards:

- internship: intern, internship, trainee, apprentice, placement;
- entry: junior, associate, graduate, entry-level, level 1/I;
- mid: mid-level, intermediate, level 2/II;
- senior: senior, lead, principal, staff, manager, architect, head, director,
  level 3/III and above.

Compound titles use the existing precedence rules. JEV may resolve missing or
ambiguous text, but it cannot override an explicit higher-stage marker during
the assisted release.

## Proposed application types

The following is a design contract, not implementation code:

```ts
type QuestionSetVersion = "job-classification-v1";

type JobDecisionState = {
  sourceKind: string;
  title: string;
  company?: string;
  location: string;
  remoteFlag: boolean;
  employmentType?: string;
  tags: string[];
  description: string;
  deterministicSignals: {
    careerStage: "internship" | "entry" | "mid" | "senior" | "other";
    careerStageTerms: string[];
    workArrangement: "onsite" | "hybrid" | "remote";
  };
};

type ValidatedJobDecision = {
  questionSetVersion: QuestionSetVersion;
  isTechnologyRole: { value: number };
  roleFamily: { value: string; confidence: number };
  careerStage: { value: string; confidence: number };
  workArrangement: { value: string; confidence: number };
  contentQuality: { value: string; confidence: number };
};
```

The implementation must adapt these fields to the exact pinned SDK response
rather than assuming the original context's response shape.

## Confidence policy

Each question has its own empirically calibrated threshold. There is no global
confidence number and no threshold copied from an example.

Policy returns one of:

- `accepted`: allowed to materialize in assisted mode;
- `shadow_only`: stored for evaluation but cannot affect matching;
- `review`: ambiguous or conflicts with deterministic evidence;
- `rejected`: invalid, stale, malformed, or prohibited by a hard gate.

Thresholds are configuration tied to the question-set and policy versions.
They are promoted only from evaluation results and are never edited directly
in UI code.

## Failure contract

| Failure                   | Queue outcome                                 | Product behavior                                     |
| ------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| Timeout/network/5xx       | retry with capped backoff                     | Existing deterministic match remains                 |
| Rate limit                | retry at provider-directed or configured time | Collection continues                                 |
| Invalid credentials       | stop/circuit open; alert owner                | No repeated request storm                            |
| Invalid response/schema   | dead-letter; retain diagnostic code           | Result cannot materialize                            |
| Stale content hash        | complete as stale                             | Newer queue item owns current profile                |
| Low confidence            | succeed with abstention/review                | Existing deterministic result remains                |
| Non-job/malformed content | accepted quality decision                     | Hide from relevant views only after rollout approval |

Errors exposed to members are generic. Owner diagnostics use stable error codes
and correlation ids and exclude provider secrets and full job descriptions.
User-triggered CV reviews additionally require a successful daily-allowance
reservation before the provider call. HTTP 429 includes a retry window. A
failed call releases the reservation; a cached saved review does not reserve or
spend allowance.

## Idempotency and caching

The decision identity is the hash of:

```text
normalized decision state
+ question-set version
+ policy-relevant model identifier
```

An identical identity reuses its validated evaluation. A policy threshold
change can rematerialize stored answers without calling JEV again. A question,
state-construction, or model change creates a fresh identity.

## Explanations

Jobradar produces explanations from facts, for example:

> Relevant because “Full Stack Developer” matches your Full Stack monitor,
> Colombo is within your Sri Lanka location, the listing is hybrid, and its
> career stage is entry.

Each clause maps to a persisted deterministic signal or an accepted typed JEV
answer. JEV is not asked to generate this prose.
