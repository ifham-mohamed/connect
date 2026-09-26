import { z } from "zod";

export const provenanceSchema = z
  .object({
    schema_version: z.literal(1),
    base_commit: z.string().regex(/^[a-f0-9]{40}$/),
    source_hash: z.string().regex(/^[a-f0-9]{64}$/),
    generator: z.literal(".agent/scripts/update-index.mjs"),
  })
  .strict();

export const taskSchema = z
  .object({
    schema_version: z.literal(1),
    task_id: z.string().min(1),
    goal: z.string().min(1),
    owner: z.string().min(1),
    workspace: z
      .object({
        branch: z.string().min(1),
        worktree: z.string().min(1),
        claimed_files: z.array(z.string().min(1)),
      })
      .strict()
      .optional(),
    status: z.enum([
      "planned",
      "implementing",
      "verifying",
      "blocked",
      "complete",
    ]),
    base_commit: z.string().regex(/^[a-f0-9]{40}$/),
    baseline_changes: z.array(z.string()),
    intended_files: z.array(z.string()),
    completed: z.array(z.string()),
    remaining: z.array(z.string()),
    verification: z.array(z.string()),
  })
  .strict();

export const handoffSchema = z
  .object({
    schema_version: z.literal(1),
    task_id: z.string().min(1),
    goal: z.string().min(1),
    constraints: z.array(z.string()),
    evidence: z.array(z.string()),
    changed_files: z.array(z.string()),
    verification: z.array(z.string()),
    remaining: z.array(z.string()),
  })
  .strict();

export const mapSchema = z
  .object({
    schema_version: z.literal(1),
    base_commit: z.string().regex(/^[a-f0-9]{40}$/),
    sources: z.array(
      z
        .object({
          path: z.string().min(1),
          subsystem: z.string().min(1),
          sha256: z.string().regex(/^[a-f0-9]{64}$/),
        })
        .strict(),
    ),
    packages: z
      .record(
        z.string(),
        z
          .object({
            root: z.string(),
            entrypoints: z.array(z.string()),
            tests: z.string(),
          })
          .strict(),
      )
      .optional(),
    subsystems: z
      .record(
        z.string(),
        z
          .object({
            roots: z.array(z.string()),
            entrypoints: z.array(z.string()),
            tests: z.array(z.string()),
            docs: z.array(z.string()),
            depends_on: z.array(z.string()),
            review: z.array(z.string()),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();
