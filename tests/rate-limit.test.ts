import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import type { Pool } from "pg";
import {
  consumeRateLimit,
  RateLimitError,
  rateLimitResponse,
} from "../src/lib/rate-limit";

const database = new PGlite();
const queryable = database as unknown as Pick<Pool, "query">;

beforeAll(async () => {
  await database.exec(
    await readFile(
      new URL("../db/030_request_rate_limits.sql", import.meta.url),
      "utf8",
    ),
  );
});
afterAll(async () => database.close());

describe("persistent request rate limits", () => {
  it("enforces a fixed window atomically and reports remaining requests", async () => {
    const first = await consumeRateLimit(
      queryable,
      "test:write",
      "member-one",
      2,
      60,
    );
    const second = await consumeRateLimit(
      queryable,
      "test:write",
      "member-one",
      2,
      60,
    );
    const third = await consumeRateLimit(
      queryable,
      "test:write",
      "member-one",
      2,
      60,
    );
    expect(first).toMatchObject({ allowed: true, remaining: 1 });
    expect(second).toMatchObject({ allowed: true, remaining: 0 });
    expect(third.allowed).toBe(false);
    expect(third.retryAfter).toBeGreaterThan(0);
  });

  it("starts a fresh count after the window expires", async () => {
    await database.query(
      "UPDATE request_rate_limits SET reset_at=now()-interval '1 second' WHERE scope=$1 AND identity=$2",
      ["test:write", "member-one"],
    );
    await expect(
      consumeRateLimit(queryable, "test:write", "member-one", 2, 60),
    ).resolves.toMatchObject({ allowed: true, remaining: 1 });
  });

  it("returns a standards-friendly 429 response", async () => {
    const response = rateLimitResponse(new RateLimitError(45, 10));
    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("45");
    expect(response?.headers.get("RateLimit-Limit")).toBe("10");
  });
});
