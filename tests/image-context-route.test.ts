import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeWrite: vi.fn(),
  query: vi.fn(),
  withDatabaseRetry: vi.fn(),
}));

vi.mock("../src/lib/auth", () => ({
  authorizeWrite: mocks.authorizeWrite,
}));

vi.mock("../src/lib/db", () => ({
  withDatabaseRetry: mocks.withDatabaseRetry,
}));

vi.mock("../src/lib/rate-limit", () => ({
  rateLimitResponse: () => null,
}));

import { POST } from "../src/app/api/jobs/[id]/image-context/route";

describe("job image context route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorizeWrite.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      role: "member",
    });
    mocks.query.mockResolvedValue({
      rows: [
        {
          text: "A reviewed vacancy description with enough useful information.",
          confidence: 92,
          savedAt: "2026-09-23T10:00:00.000Z",
        },
      ],
    });
    mocks.withDatabaseRetry.mockImplementation(
      (handler: (client: { query: typeof mocks.query }) => unknown) =>
        handler({ query: mocks.query }),
    );
  });

  it("saves an authorized listing with one retryable database statement", async () => {
    const response = await POST(
      new Request(
        "http://localhost/api/jobs/d97bc861-f15e-4bc9-ac6e-4e0be2bc3216/image-context",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: "A reviewed vacancy description with enough useful information.",
            confidence: 92,
          }),
        },
      ),
      {
        params: Promise.resolve({
          id: "d97bc861-f15e-4bc9-ac6e-4e0be2bc3216",
        }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      confidence: 92,
    });
    expect(mocks.withDatabaseRetry).toHaveBeenCalledOnce();
    expect(mocks.query).toHaveBeenCalledOnce();
    expect(mocks.query.mock.calls[0][0]).toContain(
      "INSERT INTO job_user_states",
    );
    expect(mocks.query.mock.calls[0][0]).toContain("monitor_matches");
  });

  it("does not disclose a job that is outside the user's workspace", async () => {
    mocks.query.mockResolvedValue({ rows: [] });
    const response = await POST(
      new Request(
        "http://localhost/api/jobs/d97bc861-f15e-4bc9-ac6e-4e0be2bc3216/image-context",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: "A reviewed vacancy description with enough useful information.",
          }),
        },
      ),
      {
        params: Promise.resolve({
          id: "d97bc861-f15e-4bc9-ac6e-4e0be2bc3216",
        }),
      },
    );

    expect(response.status).toBe(404);
  });
});
