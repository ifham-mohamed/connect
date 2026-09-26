import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
  release: vi.fn(),
  authorize: vi.fn(),
  audit: vi.fn(),
  sync: vi.fn(),
  match: vi.fn(),
  rate: vi.fn(),
}));
vi.mock("../src/lib/db", () => ({
  db: () => ({ query: mocks.query, connect: mocks.connect }),
}));
vi.mock("../src/lib/auth", () => ({ authorizeWrite: mocks.authorize }));
vi.mock("../src/lib/security", () => ({ recordSecurityEvent: mocks.audit }));
vi.mock("../src/lib/sync", () => ({ syncSources: mocks.sync }));
vi.mock("../src/lib/matching-repository", () => ({
  rebuildMatchesForMonitor: mocks.match,
}));
vi.mock("../src/lib/rate-limit", async (original) => ({
  ...(await original<typeof import("../src/lib/rate-limit")>()),
  consumeRateLimit: mocks.rate,
}));
const { POST } = await import("../src/app/api/actions/route");
const id = "12345678-1234-4234-8234-123456789012";
const monitor = {
  name: "Engineering",
  keywords: ["engineer"],
  excludedKeywords: [],
  location: "",
  remoteOnly: false,
  enabled: true,
};
function request(
  action: string,
  data?: unknown,
  inputId: string | undefined = id,
) {
  return POST(
    new Request("http://localhost/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id: inputId, data }),
    }),
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.authorize.mockResolvedValue({ id, role: "owner" });
  mocks.query.mockResolvedValue({ rows: [{ id }], rowCount: 1 });
  mocks.connect.mockResolvedValue({
    query: mocks.query,
    release: mocks.release,
  });
  mocks.rate.mockResolvedValue({ allowed: true });
  mocks.sync.mockResolvedValue({ synced: 1 });
});

describe("actions HTTP contract", () => {
  it.each([
    ["monitor-save", monitor],
    ["monitor-delete", undefined],
    [
      "source-add",
      {
        name: "ITPro",
        kind: "itpro",
        board: "software-engineering",
        intervalMinutes: 60,
      },
    ],
    ["source-toggle", true],
    ["job-status", "applied"],
    ["job-reviewed", undefined],
    ["job-note", "Follow up"],
    ["profile-update", { name: "Applicant" }],
    ["sync", undefined],
  ])("preserves %s", async (action, data) => {
    const response = await request(action as string, data);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      action === "sync" ? { synced: 1 } : { ok: true },
    );
    expect(mocks.authorize).toHaveBeenCalledWith(
      expect.any(Request),
      ["source-add", "source-toggle", "sync"].includes(action as string)
        ? "owner"
        : "member",
    );
  });
  it("rejects malformed inputs without writes", async () => {
    expect((await request("unknown")).status).toBe(400);
    expect(mocks.authorize).not.toHaveBeenCalled();
    expect((await request("job-status", "wrong")).status).toBe(400);
    expect(mocks.query.mock.calls.some(([sql]) => sql.includes("INSERT"))).toBe(
      false,
    );
  });
  it.each([
    ["UNAUTHORIZED", 401],
    ["OWNER_REQUIRED", 403],
    ["FORBIDDEN", 403],
  ])("maps %s", async (message, status) => {
    mocks.authorize.mockRejectedValue(new Error(message as string));
    expect((await request("source-toggle", true)).status).toBe(status);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("audits inaccessible jobs before rejecting a mutation", async () => {
    mocks.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const response = await request("job-note", "private");
    expect(response.status).toBe(404);
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "authorization.job_access_denied" }),
    );
  });
  it("preserves member identity in access and write queries", async () => {
    mocks.authorize.mockResolvedValue({ id, role: "member" });
    await request("job-note", " private ");
    expect(mocks.query.mock.calls[0][1]).toEqual([id, id, "member"]);
    expect(mocks.query.mock.calls[1][1]).toEqual([id, id, "private"]);
  });
  it("blocks collection at the rate limit", async () => {
    mocks.rate.mockResolvedValue({ allowed: false, retryAfter: 60, limit: 3 });
    const response = await request("sync");
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("preserves duplicate-source errors", async () => {
    mocks.query.mockRejectedValue({ code: "23505" });
    expect(
      (
        await request("source-add", {
          name: "ITPro",
          kind: "itpro",
          board: "software-engineering",
        })
      ).status,
    ).toBe(409);
  });
});

describe("monitor transaction ownership", () => {
  it("commits matching and updates under the same lock and client", async () => {
    await request("monitor-save", monitor);
    expect(mocks.query.mock.calls[0][0]).toBe("BEGIN");
    expect(mocks.query.mock.calls[1][0]).toContain("pg_advisory_xact_lock");
    expect(mocks.match).toHaveBeenCalledWith(
      expect.objectContaining({ query: mocks.query }),
      id,
    );
    expect(mocks.query.mock.calls.at(-1)?.[0]).toBe("COMMIT");
    expect(mocks.release).toHaveBeenCalledOnce();
  });
  it("rolls back a missing monitor and releases the client", async () => {
    mocks.query.mockImplementation(async (sql: string) => ({
      rows: sql.startsWith("UPDATE") ? [] : [{ id }],
      rowCount: 0,
    }));
    expect((await request("monitor-save", monitor)).status).toBe(404);
    expect(mocks.query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(mocks.match).not.toHaveBeenCalled();
    expect(mocks.release).toHaveBeenCalledOnce();
  });
  it("rolls back matching failure and releases the client", async () => {
    mocks.match.mockRejectedValue(new Error("matching failed"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await request("monitor-save", monitor)).status).toBe(500);
    } finally {
      log.mockRestore();
    }
    expect(mocks.query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(mocks.release).toHaveBeenCalledOnce();
  });
});
