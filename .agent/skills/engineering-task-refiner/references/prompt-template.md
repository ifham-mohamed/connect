# Composable engineering prompt

Use for a prompt deliverable or to shape an execution brief. Fill only sections
that improve the task. Delete unused sections and all unfilled placeholders.
Requirements describe outcomes; implementation details need evidence or an
explicit user constraint. Keep classification internal unless it helps execution.

```text
TASK
<precise requested outcome and requested mode: implement, investigate, review, or design>

CONTEXT
<relevant behavior confirmed from repository evidence>

OBSERVED / EXPECTED
<for a bug or behavior change; label supplied reports versus reproduced facts>

INVESTIGATE FIRST
<specific areas and uncertainties to inspect before dependent changes>
Treat suggested causes as hypotheses. Verify paths, contracts, and framework behavior.

REQUIREMENTS
<explicit or repository-established requirements>

UI / SECURITY / DATA
<only the applicable constraints from the selected task patterns>

CONSTRAINTS AND NON-GOALS
<scope boundaries, behavior to preserve, and consequential-action limits>

IMPLEMENTATION OR MILESTONES
<only an established approach or phases that help substantial authorized work>

ACCEPTANCE CRITERIA
- <observable successful outcome>
- <relevant failure or compatibility behavior>

VERIFICATION
<appropriate repository commands and behavioral checks; proposed, not executed>
Report actual results and skips. Investigate failures; do not claim unrun checks passed.

OPEN DECISIONS
<unresolved product choices, with dependent work held pending resolution>

FINAL REPORT
<findings or changes, executed checks, and material remaining uncertainty>
```

A tiny change may need only Task, Expected behavior, Constraints, and Verification.
An investigation needs findings and evidence rather than implementation steps.
A prompt with unresolved product decisions must label dependent requirements as
conditional. Do not silently fill in target versions, routes, timing goals, access
rules, or product states from illustrative examples.
