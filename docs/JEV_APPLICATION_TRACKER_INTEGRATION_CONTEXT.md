# Application Tracker — Jev Integration Architecture & Implementation Context

> Implementation update, 2026-09-23: this source document contains design ideas as well as implemented behavior. The current application uses deterministic browser-side CV/PDF and vacancy-image extraction, saves only user-approved structured content, and sends bounded redacted evidence to JEV for personal reviews. Authenticated writes are same-origin, byte-limited while streaming, per-user rate-limited in PostgreSQL, and audited. Members default to five new job analyses per Sri Lanka calendar day; the owner manages that allowance and remains unlimited. Current implementation status is authoritative in `docs/jev/stages-4-6-implementation.md` and security behavior in `docs/SECURITY_AUDIT.md`.

**Purpose:** Production-ready context for adapting Jev into an existing job-application tracker without rebuilding the current system.

**Primary design principle:** Keep existing scraping/import, parser/LLM, database, UI, and workflow code. Add Jev as a server-side **decision layer** for classification, verification, scoring, confidence, and routing.

---

# 1. Target System

The finished tracker should support this full lifecycle:

```text
Job Source
  ↓
Raw Job Ingestion
  ↓
Text / Field Extraction
  ↓
Job Normalization
  ↓
Jev Job Classification
  ↓
Requirement Extraction
  ↓
Jev Requirement Labeling
  ↓
Jev Role Characterization
  ↓
Validation / Confidence Gate
  ↓
Canonical Job Record
  ↓
Candidate / CV Ingestion
  ↓
Candidate Normalization
  ↓
Jev Candidate Evidence Evaluation
  ↓
Deterministic Match Engine
  ↓
Action Gate
  ↓
Application Tracker Workflow
  ↓
Feedback / Calibration / Re-evaluation
```

Jev is not the application controller and is not the main generative model.

---

# 2. Responsibility Boundaries

## Existing parser / LLM

Use for:

- scraping cleanup
- extracting arbitrary strings
- job description parsing
- CV parsing
- requirement phrase extraction
- summaries
- explanations
- application notes
- cover-letter generation
- interview-question generation
- natural-language user-facing output

## Jev

Use for:

- yes/no semantic decisions
- categorical classification
- ordered scoring
- evidence verification
- requirement labeling
- role characterization
- ambiguity detection
- confidence-aware routing
- job/candidate comparisons
- workflow gates

Use Jev primitives according to the task:

```text
Noul   → Is this true?
Choice → Which predefined category applies?
Score  → How strong / how much / what level?
```

## Normal application code

Use for:

- deterministic calculations
- thresholds
- weights
- minimum requirements
- AND / OR logic
- status transitions
- database writes
- retries
- permission checks
- application actions
- UI behavior
- notifications
- audit logging

---

# 3. Core Architecture

```text
┌────────────────────────────────────────────────────────────┐
│                        TRACKER UI                          │
└─────────────────────────────┬──────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│               EXISTING APPLICATION API                    │
│ jobs / candidates / applications / matching               │
└─────────────────────────────┬──────────────────────────────┘
                              │
             ┌────────────────┴────────────────┐
             │                                 │
             ▼                                 ▼
┌───────────────────────┐         ┌──────────────────────────┐
│ Existing Parser / LLM │         │ Jev Decision Adapter     │
│ extraction/generation │         │ Noul / Choice / Score    │
└───────────┬───────────┘         └────────────┬─────────────┘
            │                                  │
            └────────────────┬─────────────────┘
                             ▼
                 ┌──────────────────────┐
                 │ Deterministic Policy │
                 │ rules / weights      │
                 │ action gates         │
                 └──────────┬───────────┘
                            ▼
                 ┌──────────────────────┐
                 │ Existing Database    │
                 └──────────────────────┘
```

---

# 4. Existing-Codebase Adaptation Rules

Do not replace working modules.

Add Jev behind a provider boundary.

Recommended logical structure:

```text
src/
├── jobs/
│   ├── ingestion/
│   ├── extraction/
│   ├── normalization/
│   ├── intelligence/
│   │   └── jev/
│   └── pipeline/
│
├── candidates/
│   ├── ingestion/
│   ├── extraction/
│   ├── normalization/
│   └── evidence/
│
├── matching/
│   ├── evaluators/
│   ├── scoring/
│   ├── policy/
│   └── action-gate/
│
├── applications/
│
└── ai/
    ├── generative/
    └── decision/
        └── jev/
```

If the existing codebase already has equivalent folders, extend them instead of duplicating them.

Jev calls must remain server-side.

Never expose the TypeSafe API key to browser code.

---

# 5. Stage 0 — Job Source Ingestion

## Inputs

Possible sources:

- pasted job description
- job-board import
- browser extension/importer
- URL fetch
- company careers page
- email/import source
- manual entry

## Preserve

```ts
RawJob {
  id
  sourceType
  sourceUrl?
  sourceExternalId?
  rawTitle?
  rawCompany?
  rawLocation?
  rawText
  capturedAt
  contentHash
}
```

## Actions

- store raw source
- compute duplicate fingerprint
- preserve source metadata
- never overwrite raw input
- queue processing

## Status

```text
INGESTED
```

---

# 6. Stage 1 — Literal Extraction

Use current extraction code / parser / LLM.

Do not use Jev for arbitrary text generation.

## Extract

```ts
ExtractedJob {
  title
  company
  description
  employmentTypeText?
  locationText?
  compensationText?
  experienceText?
  educationText?
  requirementsRaw[]
  preferredRaw[]
  responsibilitiesRaw[]
  benefitsRaw[]
}
```

## Rules

- preserve source wording
- no semantic ranking yet
- do not mark every extracted skill as mandatory
- record extraction provenance
- record missing fields

## Status

```text
TEXT_EXTRACTED
```

---

# 7. Stage 2 — Deterministic Normalization

Normalize values that do not require semantic judgment.

Examples:

```text
"Full-Time" → full_time
"3+ Years"  → minimumExperienceYears = 3
"React.js"  → react
"NextJS"    → nextjs
"TS"        → typescript
"AWS"       → aws
```

Maintain a canonical taxonomy.

## Canonical taxonomies

```text
role families
seniority levels
employment types
work modes
skills
tools
frameworks
cloud platforms
testing technologies
AI technologies
business domains
requirement types
```

Do not force ambiguous items into a category here.

Ambiguous semantic decisions go to Jev.

---

# 8. Stage 3 — Jev Job Classification

## State

Send a compact structured state:

```ts
{
  title,
  description,
  employmentTypeText,
  locationText,
  experienceText,
  responsibilitiesRaw,
  requirementsRaw,
  preferredRaw
}
```

## Questions

### Role family — Choice

```text
Which role family best represents the primary work of this job?
```

Controlled choices may include:

```text
Frontend Engineering
Backend Engineering
Full-Stack Engineering
Mobile Engineering
AI / Machine Learning
Data / BI
DevOps / Platform / Cloud
QA / Test Engineering
Security Engineering
Product
Design
Project / Program Management
Business / Operations
Other
```

### Seniority — Choice

```text
What seniority level is explicitly stated or best supported by
the responsibilities and experience expectations?
```

Choices:

```text
Intern
Entry
Junior
Mid
Senior
Lead
Staff / Principal
Manager
Director+
Unclear
```

### Work mode — Choice

```text
What work arrangement is supported by the job description?
```

Choices:

```text
On-site
Hybrid
Remote
Remote within specified geography
Unclear
```

### Employment type — Choice

Only when extraction is ambiguous.

### Domain classification — Choice

Only if the tracker uses industry/domain filtering.

## Output

```ts
JobClassification {
  roleFamily
  roleFamilyProbabilities
  seniority
  seniorityProbabilities
  workMode
  workModeProbabilities
  domain?
  model
  questionSetVersion
}
```

## Status

```text
CLASSIFIED
```

---

# 9. Stage 4 — Requirement Candidate Extraction

Use current extractor/LLM to identify possible requirements.

Example:

```text
React.js
Next.js
JavaScript
TypeScript
HTML
CSS
responsive design
REST APIs
Git
frontend architecture
reusable components
debugging
AI development tools
Next.js App Router
Tailwind CSS
TanStack Query
state management
AI/LLM APIs
automated testing
Docker
CI/CD
AWS
Azure
```

At this stage these are only candidates.

---

# 10. Stage 5 — Requirement Canonicalization

Map phrases to canonical entities.

Example:

```ts
RequirementCandidate {
  canonicalId: "nextjs"
  sourceText: "Strong experience with Next.js"
  sourceSection: "requirements"
  sourceSpan?: ...
}
```

Preserve:

- canonical ID
- exact source phrase
- source section
- source location/span when available
- extractor confidence if available

---

# 11. Stage 6 — Jev Requirement Labeling

This is a primary Jev integration point.

Each candidate requirement is classified against the complete job state.

## Requirement-type Choice

```text
Considering the complete job description, how should
"<requirement>" be classified?
```

Choices:

```text
Hard Requirement
Alternative Requirement
Preferred / Nice-to-Have
Contextual Mention
Not a Candidate Requirement
```

## Capability-type Choice

When useful:

```text
What does "<requirement>" represent in this job?
```

Choices:

```text
Core technical skill
Supporting technical skill
Tool / platform
Architecture capability
Delivery / ownership capability
Communication / collaboration capability
Domain knowledge
Credential / education
Experience requirement
Other
```

## Output

```ts
LabeledRequirement {
  canonicalId
  label
  labelProbabilities
  capabilityType?
  capabilityProbabilities?
  sourceText
  sourceSection
}
```

---

# 12. Stage 7 — Preserve Logical Requirement Groups

Do not flatten job wording such as:

```text
JavaScript and/or TypeScript
AWS or Azure
React Query / TanStack Query
```

into multiple mandatory requirements.

Represent logical groups explicitly.

## Alternative requirement

```ts
{
  id: "primary-language",
  type: "required_alternative",
  minimumSatisfied: 1,
  members: ["javascript", "typescript"]
}
```

## Preferred alternative

```ts
{
  id: "cloud-platform",
  type: "preferred_alternative",
  minimumSatisfied: 1,
  members: ["aws", "azure"]
}
```

## Multi-requirement group

Support:

```text
ALL
ANY
AT_LEAST_N
OPTIONAL_ANY
```

These relationships should be enforced by code after semantic labeling.

---

# 13. Stage 8 — Jev Role Characterization

Evaluate role expectations separately from individual skills.

Recommended dimensions:

### Ownership — Score

```text
0 No ownership expectation
1 Executes assigned tasks
2 Independently delivers defined features
3 Owns major features and technical decisions
4 Owns architecture and end-to-end frontend delivery
```

### Architecture responsibility — Score

```text
0 None
1 Basic component-level decisions
2 Feature-level architecture
3 Application-level architecture
4 Major technical direction / platform ownership
```

### Independence — Score

```text
0 Closely supervised
1 Regular guidance required
2 Independent execution
3 Independent problem solving and planning
4 High autonomy / technical leadership
```

### AI relationship — Choice

```text
Core AI engineering
AI-powered product development
AI-assisted software development
Incidental AI exposure
No meaningful AI component
```

### Collaboration expectation — Score

Optional.

### Leadership expectation — Score

Optional.

Store score, distribution, and confidence.

---

# 14. Stage 9 — Job Quality / Validation Gate

Before a job becomes matcher-ready, validate the normalized representation.

## Jev Noul checks

```text
Is there enough information to reliably classify the role family?
```

```text
Is there enough information to reliably classify seniority?
```

```text
Are required and preferred qualifications distinguishable?
```

```text
Does the normalized representation materially contradict the
original job description?
```

```text
Does the job appear internally inconsistent in a way that should
require review?
```

## Deterministic validation

Also check in code:

- title exists
- company exists when required
- description minimum length
- role family set
- requirement collection not empty
- duplicate groups valid
- canonical IDs valid
- no impossible AND/OR group
- source text preserved

## Gate

```text
high-confidence + valid
    → READY

uncertain but usable
    → READY_WITH_WARNINGS

material ambiguity
    → NEEDS_REVIEW

invalid extraction
    → EXTRACTION_FAILED
```

---

# 15. Final Canonical Job Record

```ts
CanonicalJob {
  id

  source: {
    rawJobId
    sourceType
    sourceUrl?
    capturedAt
  }

  identity: {
    title
    company
  }

  classification: {
    roleFamily
    seniority
    employmentType
    workMode
    geography[]
    minimumExperienceYears?
  }

  responsibilities[]

  requirements: {
    required[]
    preferred[]
    contextual[]
    alternativeGroups[]
  }

  characteristics: {
    ownershipScore?
    architectureScore?
    independenceScore?
    leadershipScore?
    aiRelationship?
  }

  quality: {
    processingStatus
    warnings[]
    reviewRequired
  }

  intelligence: {
    provider: "typesafe"
    model
    jobQuestionSetVersion
    requirementQuestionSetVersion
  }
}
```

The canonical job is the only job representation consumed by the matching engine.

---

# 16. Example — Celestial BI

## Input

```text
Senior Frontend Engineer — React / Next.js / AI
Company: Celestial BI
Full-Time
3+ Years
Sri Lanka / Remote
```

## Classification

```text
Role Family:
Frontend Engineering

Seniority:
Senior

Work Mode:
Remote within specified geography

Geography:
Sri Lanka

Minimum Experience:
3 years
```

## Required

```text
React.js
Next.js
HTML
CSS
Responsive Design
REST API Integration
Git
Frontend Architecture
Reusable Component Design
Debugging
Problem Solving
Independent Delivery
AI Development Tools
```

## Required alternative group

```text
JavaScript OR TypeScript
minimum = 1
```

## Preferred

```text
Next.js App Router
TypeScript
Tailwind CSS
TanStack Query
State Management
AI/LLM APIs
Automated Testing
Docker
CI/CD
```

## Preferred alternative group

```text
AWS OR Azure
minimum = 1
```

## Role characteristics

```text
Frontend ownership       → high
Architecture expectation → high
Independence             → high
AI relationship          → AI-powered / AI-assisted development
```

Do not incorrectly classify the primary role as AI/ML Engineering simply because AI is mentioned repeatedly.

---

# 17. Candidate Pipeline

After jobs are normalized, process candidates independently.

```text
CV / Profile
   ↓
Raw Candidate
   ↓
Literal Extraction
   ↓
Canonical Skill Mapping
   ↓
Experience / Project Evidence
   ↓
Candidate Evidence Record
```

## Candidate canonical record

```ts
CanonicalCandidate {
  id

  skills[]
  roles[]
  employmentHistory[]
  projects[]
  education[]
  certifications[]

  evidence: {
    skills[]
    ownership[]
    architecture[]
    delivery[]
    aiUsage[]
  }
}
```

Do not send unnecessary personal identifiers to Jev.

Exclude where not required:

```text
name
email
phone
home address
national ID
passport
```

---

# 18. Candidate Evidence Model

A candidate should not receive credit merely because a keyword exists.

Store evidence.

```ts
CandidateEvidence {
  canonicalId
  evidenceType
  source
  sourceText
  recency?
  duration?
  professionalContext?
}
```

Example evidence types:

```text
professional_experience
project_experience
education
certification
self_claim
inferred
```

Matching should prefer stronger evidence.

---

# 19. Jev Candidate-to-Job Evaluation

State:

```ts
{
  job: CanonicalJob,
  candidate: CanonicalCandidate
}
```

Use independent narrow questions.

## Required-skill evidence — Noul

Example:

```text
Does the candidate provide credible professional evidence
of React.js experience relevant to this job?
```

Repeat for material requirements.

## Senior ownership — Score

```text
How strong is the candidate's evidence of independently owning
frontend features from requirements through production?
```

Suggested rubric:

```text
0 No relevant evidence
1 Mainly assisted / task execution
2 Independent feature delivery
3 Feature ownership + technical decisions
4 Senior ownership + architecture responsibility
```

## Architecture — Score

Evaluate:

```text
reusable components
frontend architecture
API integration
performance
debugging
maintainability
```

## AI development workflow — Noul / Score

Use only when relevant to the job.

## Choice questions

Use for categorical comparisons only.

Do not ask:

```text
Is this candidate a good fit?
```

Decompose the decision instead.

---

# 20. Matching Engine

Jev produces semantic evidence.

The application computes the final match.

## Match dimensions

Recommended:

```text
hard requirement coverage
alternative-group coverage
preferred requirement coverage
experience alignment
seniority alignment
role-family alignment
ownership alignment
architecture alignment
work-mode/geography eligibility
AI capability when relevant
evidence strength
```

## Example structure

```ts
MatchBreakdown {
  requiredCoverage
  preferredCoverage
  seniorityAlignment
  experienceAlignment
  ownershipAlignment
  architectureAlignment
  aiAlignment?
  overallScore
}
```

Do not hard-code one universal weight system.

Version the scoring policy.

```text
matching-policy-v1
matching-policy-v2
```

---

# 21. Hard Gates vs Weighted Signals

Some conditions should not be hidden inside a weighted average.

## Hard gates

Examples:

```text
geographic eligibility
legal/work authorization when explicitly required
mandatory credential
mandatory language
minimum experience when strictly enforced
required alternative group not satisfied
```

## Weighted signals

Examples:

```text
preferred tools
architecture depth
ownership
AI tooling
domain familiarity
optional cloud experience
```

A candidate can have a high weighted score and still fail a genuine hard gate.

Preserve both.

---

# 22. Action Gate

The match engine should not directly mutate application status.

Pass results through an action policy.

```text
Evaluation
   ↓
Policy
   ↓
Action Gate
```

Possible actions:

```text
STRONG_MATCH
REVIEW
MISSING_CRITICAL_REQUIREMENT
INSUFFICIENT_EVIDENCE
LOW_ALIGNMENT
BLOCKED_BY_HARD_GATE
READY_TO_APPLY
```

Example:

```ts
if (hardGateFailed) {
  return "BLOCKED_BY_HARD_GATE"
}

if (criticalEvidenceUncertain) {
  return "REVIEW"
}

if (overallScore >= strongThreshold) {
  return "STRONG_MATCH"
}

return "REVIEW"
```

Thresholds belong to application policy, not Jev prompts.

---

# 23. Application Workflow Integration

The resulting evaluation can drive existing tracker features.

```text
Job imported
  ↓
Processed
  ↓
Ready
  ↓
Candidate matched
  ↓
Review
  ↓
Saved / Applied / Rejected / Archived
```

Suggested application statuses remain separate from AI decisions.

Example:

```text
DISCOVERED
SAVED
PREPARING
READY_TO_APPLY
APPLIED
INTERVIEW
OFFER
REJECTED
WITHDRAWN
ARCHIVED
```

AI result and application state must not be the same field.

---

# 24. Explainability Layer

Do not ask Jev to generate long explanations.

Build explanations from stored structured results.

Example UI:

```text
Overall Alignment: 84%

Strong evidence
✓ React
✓ REST API integration
✓ TypeScript
✓ AI-assisted development

Review
△ Next.js production depth
△ Senior ownership depth

Missing evidence
— Docker
— AWS / Azure
```

A normal LLM may convert the structured evidence into user-friendly prose when needed.

---

# 25. Database Additions

Adapt to the existing schema; do not duplicate existing job/candidate tables.

Recommended logical entities:

```text
job_processing_runs
job_classifications
job_requirements
job_requirement_groups
job_characteristics
job_evaluations

candidate_evidence

candidate_job_evaluations
candidate_job_requirement_results

ai_question_sets
ai_policy_versions
```

---

# 26. Job Processing Run

```ts
JobProcessingRun {
  id
  jobId
  status
  pipelineVersion
  startedAt
  completedAt?
  parserVersion?
  normalizationVersion?
  jevModel?
  errorCode?
}
```

This allows reprocessing without destroying older output.

---

# 27. Jev Evaluation Audit Record

Store every decision set.

```ts
JevEvaluation {
  id
  entityType
  entityId

  purpose
  provider
  model
  questionSetVersion

  stateHash
  requestSnapshot?
  answerSnapshot

  latencyMs?
  usage?
  createdAt
}
```

For sensitive systems, store only approved state snapshots or hashes.

---

# 28. Candidate-Job Evaluation Record

```ts
CandidateJobEvaluation {
  id
  candidateId
  jobId

  matchingPolicyVersion
  questionSetVersion
  provider
  model

  requiredCoverage
  preferredCoverage
  ownershipScore
  architectureScore
  experienceAlignment
  seniorityAlignment

  hardGatePassed
  hardGateReasons[]

  overallScore
  action

  rawDecisionData
  createdAt
}
```

---

# 29. Version Everything That Changes Meaning

Version:

```text
job extraction schema
canonical taxonomy
Jev question sets
Jev model
matching weights
hard-gate policy
action thresholds
pipeline version
```

Never overwrite historical evaluations silently.

---

# 30. Jev Adapter Contract

Do not scatter direct TypeSafe calls through business modules.

Use one adapter.

```ts
interface DecisionProvider {
  evaluate<TState, TResult>(
    purpose: string,
    state: TState,
    questionSetVersion: string
  ): Promise<TResult>
}
```

Implementation:

```text
DecisionProvider
   └── JevDecisionProvider
```

This keeps the application testable and provider-independent.

---

# 31. Jev API Boundary

Current TypeSafe System One API concept:

```text
POST /v1/systemone
```

Authentication:

```text
Authorization: Bearer <API_KEY>
```

Use available model discovery rather than permanently assuming a model name.

Conceptual request:

```json
{
  "state": {},
  "questions": {}
}
```

The exact SDK/API payload should follow the installed/current TypeSafe SDK version.

---

# 32. Question-Set Organization

```text
jev/
├── client
├── types
│
├── questions/
│   ├── job-classification.v1
│   ├── requirement-labeling.v1
│   ├── job-characteristics.v1
│   ├── job-validation.v1
│   ├── candidate-requirements.v1
│   └── candidate-role-alignment.v1
│
├── evaluators/
│   ├── classify-job
│   ├── classify-requirements
│   ├── characterize-job
│   ├── validate-job
│   └── evaluate-candidate-job
│
└── policy/
    ├── matching-policy
    └── action-gate
```

---

# 33. Job Pipeline Orchestrator

Single orchestration path:

```ts
async function processJob(rawJobId) {
  const raw = await loadRawJob(rawJobId)

  const extracted = await extractJob(raw)

  const normalizedBase = normalizeLiteralFields(extracted)

  const classification =
    await classifyJob(normalizedBase)

  const candidates =
    await extractRequirementCandidates(extracted)

  const canonicalCandidates =
    canonicalizeRequirements(candidates)

  const requirementLabels =
    await labelRequirements({
      job: normalizedBase,
      requirements: canonicalCandidates
    })

  const groups =
    buildRequirementGroups(
      extracted,
      requirementLabels
    )

  const characteristics =
    await characterizeJob({
      job: normalizedBase,
      classification,
      requirements: requirementLabels
    })

  const canonicalJob =
    buildCanonicalJob({
      raw,
      extracted,
      classification,
      requirementLabels,
      groups,
      characteristics
    })

  const validation =
    await validateCanonicalJob({
      raw,
      canonicalJob
    })

  const status =
    applyJobProcessingPolicy(validation)

  return persistJobProcessingResult(
    canonicalJob,
    validation,
    status
  )
}
```

---

# 34. Candidate Match Orchestrator

```ts
async function evaluateCandidateForJob(
  candidateId,
  jobId
) {
  const candidate =
    await loadCanonicalCandidate(candidateId)

  const job =
    await loadCanonicalJob(jobId)

  const semanticEvaluation =
    await evaluateCandidateEvidence({
      candidate,
      job
    })

  const hardGates =
    evaluateHardGates({
      candidate,
      job,
      semanticEvaluation
    })

  const score =
    calculateMatchScore({
      job,
      semanticEvaluation,
      policy: "matching-policy-v1"
    })

  const action =
    applyActionGate({
      job,
      hardGates,
      score,
      semanticEvaluation
    })

  return persistCandidateJobEvaluation({
    candidateId,
    jobId,
    semanticEvaluation,
    hardGates,
    score,
    action
  })
}
```

---

# 35. Conditional Evaluation

Do not ask every Jev question for every job.

Examples:

```text
if roleFamily != engineering
    skip engineering architecture dimensions

if AI not present
    skip AI capability questions

if no geographic restriction
    skip geography ambiguity questions

if requirement explicitly listed under Nice to Have
    still validate when needed, but do not run redundant analysis

if hard gate already deterministically known
    do not ask Jev
```

Use code first when the answer is deterministic.

---

# 36. Confidence Policy

Jev probabilities/confidence should affect workflow behavior.

Example conceptual policy:

```text
high confidence
    → automatic classification

medium confidence
    → save classification + warning

low confidence on material field
    → review

low confidence on non-material preferred skill
    → continue with uncertainty marker
```

Do not use one global confidence threshold for every question.

Define thresholds by decision importance.

---

# 37. Retry / Failure Strategy

If Jev is unavailable:

```text
job ingestion must not be lost
raw extraction must remain stored
job may enter INTELLIGENCE_PENDING
matching may enter EVALUATION_PENDING
```

Do not block the entire application permanently.

Retry idempotently.

Use evaluation IDs and state hashes to prevent duplicate writes.

---

# 38. Caching

Safe cache key:

```text
purpose
+ stateHash
+ questionSetVersion
+ model
```

Reuse results only when all semantic inputs are unchanged.

Invalidate on:

```text
job edit
candidate edit
taxonomy change
question-set change
matching-policy change where relevant
model migration when re-evaluation is required
```

---

# 39. Data Minimization

Send Jev only information required for the decision.

For job classification:

```text
job content only
```

For candidate match:

```text
job requirements
candidate professional evidence
```

Avoid unnecessary PII.

---

# 40. Observability

Capture:

```text
processing stage
question-set version
provider/model
request count
latency
failure code
retry count
decision confidence
review rate
manual override rate
```

Do not log API secrets.

---

# 41. Manual Overrides

Users must be able to correct:

```text
role family
seniority
requirement type
work mode
canonical skill mapping
match decision
```

Store:

```text
original AI result
manual override
override reason
timestamp
```

Do not destroy the original result.

---

# 42. Feedback Loop

Manual corrections become evaluation data.

Track:

```text
Jev decision
human decision
agreement/disagreement
question-set version
model version
```

Use this to refine:

```text
questions
rubrics
thresholds
taxonomy
matching weights
```

Do not automatically retrain or modify policy from individual feedback.

---

# 43. Evaluation Harness Before Full Automation

Create a representative labeled dataset:

```text
clear frontend jobs
ambiguous frontend/full-stack jobs
AI-heavy frontend jobs
senior vs lead jobs
remote vs geography-restricted jobs
required vs preferred skills
AND/OR requirement wording
poorly written job descriptions
duplicate/contradictory postings
```

Measure:

```text
role-family accuracy
seniority agreement
requirement-label agreement
false hard-requirement rate
review rate
manual override rate
candidate ranking consistency
```

---

# 44. Rollout Plan

## Phase 1 — Shadow mode

```text
existing tracker behavior unchanged
Jev runs silently
store results
compare with current classifications
```

## Phase 2 — Assisted mode

Use Jev for:

```text
job labels
requirement labels
warnings
match breakdown
```

Human/user retains current actions.

## Phase 3 — Gated automation

Auto-apply high-confidence non-destructive actions:

```text
classification
tagging
sorting
match bucketing
review queues
```

## Phase 4 — Advanced workflow

Use:

```text
dynamic candidate evaluation
job prioritization
application readiness
re-evaluation after candidate profile changes
re-evaluation after job edits
confidence-aware action routing
```

Destructive/external actions should remain governed by explicit application policy.

---

# 45. UI Integration

## Job page

Show:

```text
Role Family
Seniority
Work Mode
Experience
Required Skills
Preferred Skills
Alternative Groups
Role Characteristics
Warnings
```

## Candidate match page

Show:

```text
Overall alignment
Hard gates
Required coverage
Preferred coverage
Experience alignment
Ownership alignment
Architecture alignment
Evidence gaps
Uncertain areas
```

## Admin/debug view

Show:

```text
question-set version
model
raw decision outputs
probabilities
confidence
processing run
manual overrides
```

Do not expose low-level debug data to normal users unless useful.

---

# 46. Search / Filtering Benefits

The canonical job model enables reliable filters:

```text
role family
seniority
remote mode
geography
minimum experience
required technology
preferred technology
AI relevance
ownership level
architecture level
```

Do not search raw job-description strings when a canonical field exists.

---

# 47. Future Advanced Features

After the core pipeline is stable, the same decision layer can support:

```text
job duplicate / near-duplicate verification
job quality scoring
job relevance to saved candidate profile
application priority
CV evidence gap detection
CV tailoring targets
interview preparation focus
application readiness checks
job-change re-evaluation
candidate-profile-change re-evaluation
stale-job review
workflow anomaly detection
```

Each should be a separate question set and policy.

---

# 48. Non-Goals

Jev should not:

```text
scrape websites
generate CVs
generate cover letters
write emails
replace the parser
replace deterministic validation
directly change application state
directly submit applications
decide every business rule
store the source of truth
```

---

# 49. Key Engineering Rules

1. Preserve raw input.
2. Separate extraction from semantic judgment.
3. Normalize deterministic values before calling Jev.
4. Ask narrow independent questions.
5. Use Noul for yes/no.
6. Use Choice for controlled categories.
7. Use Score for strength/level.
8. Preserve probabilities and confidence.
9. Keep AND/OR requirement logic explicit.
10. Keep hard gates separate from weighted scoring.
11. Keep business actions in normal code.
12. Keep Jev server-side.
13. Version question sets and policy.
14. Store evaluation history.
15. Allow manual overrides.
16. Reuse the existing codebase instead of creating a parallel tracker.
17. Use current parser/LLM for generation and arbitrary extraction.
18. Use Jev only where semantic decisions improve reliability.
19. Build explanations from structured evidence.
20. Roll out in shadow mode before relying on automated actions.

---

# 50. Final End-to-End Processing Graph

```text
┌──────────────────┐
│ Job Source       │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Raw Ingestion    │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ LLM / Parser     │
│ Literal Extract  │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Deterministic    │
│ Normalization    │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Jev              │
│ Job Classify     │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Requirement      │
│ Extraction       │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Canonical Skill  │
│ Mapping          │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Jev Requirement  │
│ Labeling         │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ AND / OR Group   │
│ Construction     │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Jev Role         │
│ Characterization │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Validation Gate  │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Canonical Job    │
└────────┬─────────┘
         │
         │       ┌──────────────────┐
         │       │ Candidate / CV   │
         │       └────────┬─────────┘
         │                ▼
         │       ┌──────────────────┐
         │       │ Candidate Parser │
         │       └────────┬─────────┘
         │                ▼
         │       ┌──────────────────┐
         │       │ Candidate        │
         │       │ Evidence Model   │
         │       └────────┬─────────┘
         └────────┬───────┘
                  ▼
         ┌──────────────────┐
         │ Jev Candidate ↔  │
         │ Job Evaluation   │
         └────────┬─────────┘
                  ▼
         ┌──────────────────┐
         │ Deterministic    │
         │ Match Engine     │
         └────────┬─────────┘
                  ▼
         ┌──────────────────┐
         │ Hard Gates       │
         └────────┬─────────┘
                  ▼
         ┌──────────────────┐
         │ Action Gate      │
         └────────┬─────────┘
                  ▼
         ┌──────────────────┐
         │ Tracker Workflow │
         └──────────────────┘
```

---

# 51. Recommended Initial Implementation Order

```text
01. Jev server-side adapter
02. Question-set versioning
03. Job role-family classification
04. Seniority classification
05. Work-mode classification
06. Requirement candidate extraction integration
07. Requirement canonicalization
08. Jev requirement labeling
09. AND/OR requirement groups
10. Role-characteristic scores
11. Job validation gate
12. Canonical job schema
13. Persist evaluation/audit data
14. Candidate evidence schema
15. Candidate ↔ job Jev evaluation
16. Hard-gate engine
17. Weighted match engine
18. Action gate
19. Match UI
20. Manual override UI
21. Shadow evaluation dataset
22. Threshold calibration
23. Assisted rollout
24. Gated automation
```

---

# 52. Source / Platform Notes

The architecture is aligned with Jev's current System One model concept:

- unstructured/structured state in
- typed decisions out
- Noul, Choice, and Score primitives
- probabilities/confidence
- multiple narrow decisions composed in software
- deterministic application code retains workflow control

Reference material:

- TypeSafe AI — *Introducing System One Models & Jev*
- TypeSafe AI — System One API documentation
- TypeSafe AI — Workflow Evals
- Jev Playground

---

# 53. Context for Future AI Agents

When modifying the existing tracker:

```text
DO:
- inspect the current implementation first
- map existing modules to this architecture
- reuse existing schemas/services/routes where possible
- introduce the smallest compatible Jev adapter
- preserve current behavior during initial integration
- migrate incrementally
- keep feature flags for rollout
- write migrations only when schema additions are required
- add tests around policy and mapping logic
- keep question sets centralized and versioned

DO NOT:
- rebuild the tracker from scratch
- introduce duplicate job/candidate pipelines
- move business logic into prompts
- expose API keys in client code
- treat all extracted skills as mandatory
- collapse AND/OR requirements
- use a single vague "candidate fit" prompt
- let Jev directly mutate application state
- discard probabilities/confidence
- overwrite historical evaluations
```

This document is the implementation context and architectural source of truth for the Jev integration.
