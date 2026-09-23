import type { Pool, PoolClient } from "pg";

type Queryable = Pick<Pool | PoolClient, "query">;

export class RateLimitError extends Error {
  constructor(
    public readonly retryAfter: number,
    public readonly limit: number,
  ) {
    super("RATE_LIMITED");
  }
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
};

export async function consumeRateLimit(
  queryable: Queryable,
  scope: string,
  identity: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const result = await queryable.query<{
    attempts: number;
    retryAfter: number;
  }>(
    `INSERT INTO request_rate_limits(scope,identity,attempts,reset_at)
     VALUES($1,$2,1,now()+($3 * interval '1 second'))
     ON CONFLICT(scope,identity) DO UPDATE SET
       attempts=CASE WHEN request_rate_limits.reset_at<=now() THEN 1 ELSE request_rate_limits.attempts+1 END,
       reset_at=CASE WHEN request_rate_limits.reset_at<=now() THEN now()+($3 * interval '1 second') ELSE request_rate_limits.reset_at END
     RETURNING attempts::int,
       greatest(1,ceil(extract(epoch FROM (reset_at-now()))))::int AS "retryAfter"`,
    [scope.slice(0, 120), identity.slice(0, 160), windowSeconds],
  );
  const attempts = result.rows[0]?.attempts || 1;
  return {
    allowed: attempts <= limit,
    limit,
    remaining: Math.max(0, limit - attempts),
    retryAfter: result.rows[0]?.retryAfter || windowSeconds,
  };
}

export function rateLimitResponse(error: unknown) {
  if (!(error instanceof RateLimitError)) return null;
  return Response.json(
    { error: "Too many requests. Try again shortly." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(error.retryAfter),
        "RateLimit-Limit": String(error.limit),
        "RateLimit-Remaining": "0",
      },
    },
  );
}
