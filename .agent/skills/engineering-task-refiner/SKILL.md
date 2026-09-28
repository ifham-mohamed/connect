---
name: engineering-task-refiner
description: Refine rough engineering requests into scoped, repository-grounded tasks using suitable bug, feature, refactor, investigation, and operational patterns. Use at engineering task intake or when asked to rewrite an engineering prompt; preserve whether the user wants a prompt, analysis, or execution.
---

# Engineering task refiner

Prepare the task before the existing planning, implementation, review, or
verification workflow. Resolve all paths below from the repository root, including
when this file is loaded from a generated discovery copy.

## Preserve the requested mode

- A request to refine, rewrite, or prepare a prompt produces a reusable prompt;
  it does not authorize the work described inside that prompt. Explicit invocation
  of this skill alone defaults to prompt output.
- A request to fix, build, change, or otherwise perform work is authorization for
  that scoped work. Refine it briefly, then continue without a redundant approval
  step. A review, investigation, or plan stays within that requested mode.
- Follow the latest explicit user instructions. Do not turn ordinary questions,
  status requests, or unrelated writing into engineering tasks.

## Refine from evidence

1. Extract the intended outcome, explicit requirements, constraints, and supplied
   examples. Correct wording without changing intent. Separate observed facts,
   suspected causes, suggested implementations, and unresolved decisions.
2. Read applicable `AGENTS.md`, `.agent/context/project.md`, and relevant entries
   in `.agent/context/navigation.md`. Inspect current Git state and only the
   source, callers, tests, contracts, and configuration needed to frame the task.
   Verify names and behavior before stating them as facts. If unavailable, label
   them for investigation; never fabricate paths, APIs, schema, or commands.
3. Choose the smallest adequate pattern from
   `.agent/skills/engineering-task-refiner/references/task-patterns.md`.
   Combine patterns only for affected boundaries. Use complexity and risk to
   scale investigation, without printing classifications unless useful.
4. Specify the outcome before the implementation. Prescribe a technique only if
   the user requires it or reviewed repository constraints justify it. Establish
   bug causes and performance bottlenecks from evidence before prescribing fixes.
5. Resolve technical details from source when possible. Ask a focused question
   for a consequential product decision or conflicting requirements, and keep
   dependent work pending. Continue independent investigation. For prompt-only
   output, mark unresolved decisions as `OPEN DECISION` and make dependent work
   conditional. Such a prompt is not fully implementation-ready yet.
6. Define observable acceptance criteria and proportional verification using
   existing commands. Do not add performance targets, UX behavior, dependencies,
   infrastructure, or unrelated cleanup merely to fill a template.

## Apply Jobradar constraints

Use `AGENTS.md` and the relevant authorities for architecture, access isolation,
transactions, deterministic matching, and browser/server boundaries. Read
`.agent/context/architecture.md` before proposing service-boundary changes.
JEV is the only application model service; this skill is development guidance.

For Next.js work, read the relevant installed guide under
`node_modules/next/dist/docs/` before writing code. For upgrades, establish actual
installed and requested target versions and consult current official migration
guidance. Do not extrapolate framework behavior from memory.

Verification follows the project gates: `npm run agent:verify -- --docs` for
documentation only, `npm run agent:verify` for application or script changes,
and `npm run agent:verify -- --application` when a build is required. Add focused
behavior checks when relevant; a proposed command is not an executed check.
Do not run live collection, live migrations, commit, or deploy as verification.

Reuse the existing `.agent/tasks/<id>/` records for substantial authorized work;
do not create a second task-record format or save raw prompts, private data, or
conversation transcripts. A small prompt rewrite needs no task dossier.

## Deliver or continue

For prompt-only output, use
`.agent/skills/engineering-task-refiner/references/prompt-template.md` and return
the reusable prompt, followed only by material unresolved decisions. Omit empty
sections and prompt-engineering explanations. Use the host's reusable-writing
format when available, otherwise a plain text code block.

For authorized work, state a concise interpretation and important assumptions,
then continue using the applicable existing workflow. Do not print a long prompt
or ask the user to resubmit it. Keep straightforward requests to a sentence and
an observable completion check where sufficient.

Before delivery or execution, check that intent and mode are preserved, facts
have evidence, assumptions remain labelled, scope is bounded, acceptance is
observable, and verification matches the changed behavior. Report only checks
actually executed, including failures and skips.
