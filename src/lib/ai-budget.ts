import type { Pool, PoolClient } from "pg";

type Queryable = Pick<Pool | PoolClient, "query">;

export type WorkspaceAiBudget = {
  backgroundEnabled: boolean;
  monthlyRequestLimit: number;
  monthlyTokenLimit: number;
  pausedReason: string | null;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cacheHits: number;
  failures: number;
  avoidedRequests: number;
  available: boolean;
};

export async function getWorkspaceAiBudget(
  queryable: Queryable,
): Promise<WorkspaceAiBudget> {
  const result = await queryable.query<WorkspaceAiBudget>(
    `SELECT budget.background_enabled AS "backgroundEnabled",
      budget.monthly_request_limit::int AS "monthlyRequestLimit",
      budget.monthly_token_limit::int AS "monthlyTokenLimit",budget.paused_reason AS "pausedReason",
      COALESCE(usage.requests,0)::int AS requests,COALESCE(usage.input_tokens,0)::int AS "inputTokens",
      COALESCE(usage.output_tokens,0)::int AS "outputTokens",COALESCE(usage.cache_hits,0)::int AS "cacheHits",
      COALESCE(usage.failures,0)::int AS failures,COALESCE(usage.avoided_requests,0)::int AS "avoidedRequests",
      (budget.paused_reason IS NULL
       AND COALESCE(usage.requests,0)<budget.monthly_request_limit
       AND COALESCE(usage.input_tokens+usage.output_tokens,0)<budget.monthly_token_limit) AS available
     FROM ai_workspace_budget budget
     LEFT JOIN ai_workspace_usage usage
       ON usage.month=date_trunc('month',timezone('Asia/Colombo',now()))::date
     WHERE budget.singleton=true`,
  );
  return (
    result.rows[0] || {
      backgroundEnabled: false,
      monthlyRequestLimit: 0,
      monthlyTokenLimit: 0,
      pausedReason: "Workspace AI budget is not configured.",
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheHits: 0,
      failures: 0,
      avoidedRequests: 0,
      available: false,
    }
  );
}

export async function reserveWorkspaceAiRequest(
  client: PoolClient,
  background = false,
) {
  await client.query("BEGIN");
  try {
    const budget = await client.query<{
      backgroundEnabled: boolean;
      monthlyRequestLimit: number;
      monthlyTokenLimit: number;
      pausedReason: string | null;
      requests: number;
      tokens: number;
    }>(
      `SELECT budget.background_enabled AS "backgroundEnabled",
        budget.monthly_request_limit::int AS "monthlyRequestLimit",
        budget.monthly_token_limit::int AS "monthlyTokenLimit",budget.paused_reason AS "pausedReason",
        COALESCE(usage.requests,0)::int AS requests,
        COALESCE(usage.input_tokens+usage.output_tokens,0)::int AS tokens
       FROM ai_workspace_budget budget
       LEFT JOIN ai_workspace_usage usage
         ON usage.month=date_trunc('month',timezone('Asia/Colombo',now()))::date
       WHERE budget.singleton=true FOR UPDATE OF budget`,
    );
    const row = budget.rows[0];
    const allowed = Boolean(
      row &&
      !row.pausedReason &&
      (!background || row.backgroundEnabled) &&
      row.requests < row.monthlyRequestLimit &&
      row.tokens < row.monthlyTokenLimit,
    );
    if (!allowed) {
      await client.query(
        `INSERT INTO ai_workspace_usage(month,avoided_requests)
         VALUES(date_trunc('month',timezone('Asia/Colombo',now()))::date,1)
         ON CONFLICT(month) DO UPDATE SET avoided_requests=ai_workspace_usage.avoided_requests+1,updated_at=now()`,
      );
      await client.query("COMMIT");
      return {
        allowed: false,
        reason:
          row?.pausedReason ||
          (background && !row?.backgroundEnabled
            ? "Background AI is disabled."
            : "Monthly zero-spend allowance reached."),
      };
    }
    await client.query(
      `INSERT INTO ai_workspace_usage(month,requests)
       VALUES(date_trunc('month',timezone('Asia/Colombo',now()))::date,1)
       ON CONFLICT(month) DO UPDATE SET requests=ai_workspace_usage.requests+1,updated_at=now()`,
    );
    await client.query("COMMIT");
    return { allowed: true, reason: null };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

export async function completeWorkspaceAiRequest(
  queryable: Queryable,
  input: {
    inputTokens?: number;
    outputTokens?: number;
    failed?: boolean;
    cacheHit?: boolean;
  },
) {
  await queryable.query(
    `INSERT INTO ai_workspace_usage(month,input_tokens,output_tokens,failures,cache_hits)
     VALUES(date_trunc('month',timezone('Asia/Colombo',now()))::date,$1,$2,$3,$4)
     ON CONFLICT(month) DO UPDATE SET input_tokens=ai_workspace_usage.input_tokens+excluded.input_tokens,
       output_tokens=ai_workspace_usage.output_tokens+excluded.output_tokens,
       failures=ai_workspace_usage.failures+excluded.failures,cache_hits=ai_workspace_usage.cache_hits+excluded.cache_hits,
       updated_at=now()`,
    [
      input.inputTokens || 0,
      input.outputTokens || 0,
      input.failed ? 1 : 0,
      input.cacheHit ? 1 : 0,
    ],
  );
}

export async function pauseWorkspaceAi(queryable: Queryable, reason: string) {
  await queryable.query(
    "UPDATE ai_workspace_budget SET paused_reason=$1,updated_at=now() WHERE singleton=true",
    [reason.slice(0, 240)],
  );
}
