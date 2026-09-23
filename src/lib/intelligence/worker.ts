import {
  APIConnectionError,
  APIError,
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
  UnprocessableEntityError,
  BadRequestError,
  type TypeSafeClient,
} from "@typesafe-ai/sdk";
import type { PoolClient } from "pg";
import { classifyJobWithJev } from "../jev/client";
import type { JevConfig } from "../jev/config";
import type { ValidatedJobClassification } from "../jev/contract";
import { reviewShadowDecision } from "../jev/policy";
import { rebuildMatchesForJobs } from "../sync";
import {
  completeWorkspaceAiRequest,
  getWorkspaceAiBudget,
  pauseWorkspaceAi,
  reserveWorkspaceAiRequest,
} from "../ai-budget";
import {
  claimIntelligenceTasks,
  currentTaskState,
  markIntelligenceTaskStale,
  queueJobsForIntelligence,
  retryOrDeadLetterTask,
  type ClaimedIntelligenceTask,
} from "./queue";

export type JevClassificationResponse = {
  result: ValidatedJobClassification;
  requestId: string | undefined;
  latencyMs: number;
};

export type JevClassifier = (
  state: Parameters<typeof classifyJobWithJev>[1],
) => Promise<JevClassificationResponse>;

export function classifierForClient(client: TypeSafeClient): JevClassifier {
  return (state) => classifyJobWithJev(client, state);
}

function jevFailure(error: unknown) {
  if (error instanceof AuthenticationError)
    return { code: "authentication", retryable: false };
  if (error instanceof PermissionDeniedError)
    return { code: "permission_denied", retryable: false };
  if (
    error instanceof BadRequestError ||
    error instanceof UnprocessableEntityError
  )
    return { code: "invalid_request", retryable: false };
  if (error instanceof RateLimitError)
    return { code: "rate_limited", retryable: true };
  if (error instanceof APIConnectionError)
    return { code: "connection", retryable: true };
  if (error instanceof APIError)
    return {
      code:
        error.status >= 500 ? "provider_server" : `provider_${error.status}`,
      retryable: error.status >= 500,
    };
  if (error instanceof Error && error.name === "ZodError")
    return { code: "invalid_response", retryable: false };
  return { code: "unexpected", retryable: true };
}

async function saveEvaluation(
  client: Pick<PoolClient, "query">,
  task: ClaimedIntelligenceTask,
  response: JevClassificationResponse,
  state: NonNullable<Awaited<ReturnType<typeof currentTaskState>>>,
) {
  const policy = reviewShadowDecision(
    state.deterministicSignals,
    response.result,
  );
  await client.query("BEGIN");
  try {
    const current = await client.query<{ status: string }>(
      "SELECT status FROM job_intelligence_queue WHERE id=$1 FOR UPDATE",
      [task.id],
    );
    if (current.rows[0]?.status !== "processing") {
      await client.query("ROLLBACK");
      return false;
    }
    const evaluation = await client.query<{ id: string }>(
      `INSERT INTO jev_evaluations(
         job_id,queue_id,content_hash,state_hash,question_set_version,model_identifier,
         response,policy_status,policy_reasons,latency_ms,input_tokens,output_tokens,request_id
       ) VALUES($1,$2,$3,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [
        task.jobId,
        task.id,
        task.contentHash,
        task.questionSetVersion,
        response.result.model,
        JSON.stringify(response.result.answers),
        policy.status,
        policy.reasons,
        response.latencyMs,
        response.result.usage.input_tokens,
        response.result.usage.output_tokens,
        response.requestId || null,
      ],
    );
    const answers = response.result.answers;
    const careerStage =
      answers.careerStage.choice === "unclear"
        ? "other"
        : answers.careerStage.choice;
    await client.query(
      `INSERT INTO job_intelligence_profiles(
         job_id,evaluation_id,content_hash,role_family,career_stage,work_arrangement,
         technology_relevance,content_quality,confidence,policy_status,needs_review,policy_version
       ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,'shadow-v1')
       ON CONFLICT(job_id) DO UPDATE SET
         evaluation_id=excluded.evaluation_id,content_hash=excluded.content_hash,
         role_family=excluded.role_family,career_stage=excluded.career_stage,
         work_arrangement=excluded.work_arrangement,
         technology_relevance=excluded.technology_relevance,
         content_quality=excluded.content_quality,confidence=excluded.confidence,
         policy_status=excluded.policy_status,needs_review=excluded.needs_review,
         policy_version=excluded.policy_version,updated_at=now()`,
      [
        task.jobId,
        evaluation.rows[0].id,
        task.contentHash,
        answers.roleFamily.choice,
        careerStage,
        answers.workArrangement.choice,
        answers.isTechnologyRole.noul,
        answers.contentQuality.choice,
        JSON.stringify({
          roleFamily: answers.roleFamily.confidence,
          careerStage: answers.careerStage.confidence,
          workArrangement: answers.workArrangement.confidence,
          contentQuality: answers.contentQuality.confidence,
        }),
        policy.status,
        policy.status === "review",
      ],
    );
    await client.query(
      `UPDATE job_intelligence_queue
          SET status='succeeded',locked_at=NULL,locked_by=NULL,updated_at=now()
        WHERE id=$1`,
      [task.id],
    );
    if (process.env.JEV_MODE === "assisted") {
      await client.query("SELECT pg_advisory_xact_lock(741210)");
      await rebuildMatchesForJobs(client, [task.jobId]);
    }
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function processIntelligenceBatch(
  client: Pick<PoolClient, "query">,
  classifier: JevClassifier,
  config: Pick<JevConfig, "batchSize" | "maxAttempts">,
  workerId: string,
) {
  const budget = await getWorkspaceAiBudget(client);
  if (!budget.backgroundEnabled || !budget.available)
    return {
      claimed: 0,
      succeeded: 0,
      retrying: 0,
      dead: 0,
      stale: 0,
      pausedReason:
        budget.pausedReason ||
        (!budget.backgroundEnabled
          ? "Background AI is disabled."
          : "Monthly zero-spend allowance reached."),
    };
  const tasks = await claimIntelligenceTasks(
    client,
    workerId,
    config.batchSize,
  );
  const summary = {
    claimed: tasks.length,
    succeeded: 0,
    retrying: 0,
    dead: 0,
    stale: 0,
  };
  for (const task of tasks) {
    let workspaceReserved = false;
    try {
      const state = await currentTaskState(client, task);
      if (!state) {
        await markIntelligenceTaskStale(client, task.id);
        await queueJobsForIntelligence(client, [task.jobId]);
        summary.stale++;
        continue;
      }
      const reservation = await reserveWorkspaceAiRequest(
        client as PoolClient,
        true,
      );
      if (!reservation.allowed) {
        await client.query(
          `UPDATE job_intelligence_queue SET status='pending',locked_at=NULL,locked_by=NULL,
             available_at=now()+interval '1 hour',updated_at=now() WHERE id=$1`,
          [task.id],
        );
        break;
      }
      workspaceReserved = true;
      const response = await classifier(state);
      await completeWorkspaceAiRequest(client, {
        inputTokens: response.result.usage.input_tokens,
        outputTokens: response.result.usage.output_tokens,
      });
      if (await saveEvaluation(client, task, response, state))
        summary.succeeded++;
      else summary.stale++;
    } catch (error) {
      if (workspaceReserved)
        await completeWorkspaceAiRequest(client, { failed: true }).catch(
          () => {},
        );
      const failure = jevFailure(error);
      if (failure.code === "rate_limited" || failure.code === "provider_402")
        await pauseWorkspaceAi(
          client,
          failure.code === "provider_402"
            ? "AI provider credit is unavailable. Background processing is paused."
            : "AI provider quota was reached. Background processing is paused.",
        ).catch(() => {});
      const status = await retryOrDeadLetterTask(
        client,
        task,
        failure.code,
        failure.retryable,
        config.maxAttempts,
      );
      summary[status]++;
    }
  }
  return summary;
}
