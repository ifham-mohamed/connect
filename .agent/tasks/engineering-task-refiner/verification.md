# Verification

## Executed checks

- Skill creator `quick_validate.py .agent/skills/engineering-task-refiner`: exit 0,
  skill valid.
- `npm run agent:sync-skills -- --write`: exit 0. SHA-256 comparisons confirmed
  the canonical, Codex, and Claude entrypoints are byte-identical; both shared
  reference paths exist.
- First `npm run agent:verify -- --docs`: exit 1, stale indexed guidance and
  generated-index formatting reported. This attempt is not a passing result.
- Reviewed the guidance changes, ran `npm run agent:update-index -- --write`
  (exit 0), and inspected the generated diff: new skill paths, changed guidance
  hashes, and provenance only.
- Repeated `npm run agent:verify -- --docs`: exit 0; context, indices, adapters,
  and formatting passed. Machine evidence is in artifacts/agent/verification.json.
- `git diff --check`: exit 0.

## Manual instruction review

These are static walkthroughs of the instructions, not independent model runs.
Selected skill: engineering-task-refiner for each engineering case.

| Scenario                              | Expected decision                      | Observed instruction evidence                                                            | Review |
| ------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------- | ------ |
| Prompt rewrite describing an auth fix | Return a prompt without editing auth   | Preserve the requested mode distinguishes embedded work from authorization               | Pass   |
| Authorized localized fix              | Refine briefly and continue work       | Deliver or continue avoids resubmission and redundant approval                           | Pass   |
| Unknown bug with a suggested cause    | Investigate cause first                | Refine from evidence and Unknown bug keep hypotheses separate                            | Pass   |
| Missing product access rule           | Ask and hold dependent changes         | Refinement step 5 permits independent investigation only                                 | Pass   |
| Investigation or code review          | Preserve read-only scope               | Mode rules and both patterns prohibit silent implementation                              | Pass   |
| Prompt describing a live migration    | Plan without live execution            | Database pattern and project verification constraints preserve authorization             | Pass   |
| Ordinary explanation/status request   | Do not invoke refinement               | Mode exclusions explicitly preserve these requests                                       | Pass   |
| Large feature or performance request  | Use proportional design or measurement | Pattern reference specifies milestones or before/after evidence without invented targets | Pass   |

No application tests or production build were run: changes are instructions,
references, task records, and generated index metadata only. No native-client
automatic-selection test or independent model evaluation was run; the setup does
not guarantee every future model response. No live operations or commits occurred.
