import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
describe("matching persistence boundary", () => {
  it.each(["off", "assisted"])(
    "retains %s mode and caller-owned transactions",
    async (mode) => {
      vi.stubEnv("JEV_MODE", mode);
      vi.resetModules();
      const matching = await import("../src/lib/matching-repository");
      const query = vi.fn().mockResolvedValue({ rows: [] });
      await matching.rebuildMatchesForJobs({ query }, []);
      expect(query).not.toHaveBeenCalled();
      await matching.rebuildMatchesForJobs({ query }, ["job-id"]);
      expect(query.mock.calls[0][1]).toEqual([["job-id"]]);
      expect(query.mock.calls[1][0]).toContain(
        mode === "assisted"
          ? "jobradar_assisted_match"
          : "jobradar_work_mode_match",
      );
      expect(
        query.mock.calls.some(([sql]) => /BEGIN|COMMIT|ROLLBACK/.test(sql)),
      ).toBe(false);
    },
  );
});
