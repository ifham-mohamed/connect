import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";
import { boundaryViolations } from "../.agent/scripts/architecture-check.mjs";

describe("targeted module boundaries", () => {
  it("rejects resolved alias and explicit extension dependencies", () => {
    expect(
      boundaryViolations([
        {
          from: "src/lib/matching-repository.ts",
          to: "src/lib/sync.ts",
          specifier: "@/lib/sync.ts",
        },
        {
          from: "src/lib/actions/profile.ts",
          to: "src/components/dashboard.tsx",
          specifier: "../../components/dashboard.tsx",
        },
        {
          from: "src/lib/actions/profile.ts",
          to: null,
          specifier: "next/server",
        },
      ]),
    ).toHaveLength(3);
    expect(
      boundaryViolations([
        { from: "src/lib/matching-repository.ts", to: null, specifier: "pg" },
      ]),
    ).toEqual([]);
  });
  const eslint = new ESLint();
  beforeAll(async () => {
    // Load the Next ESLint configuration once; cold startup on Windows can
    // exceed the per-test limit without indicating a boundary-check failure.
    await eslint.calculateConfigForFile("src/lib/matching-repository.ts");
  }, 120000);
  it.each([
    ["src/lib/matching-repository.ts", 'import { syncSources } from "./sync";'],
    [
      "src/lib/actions/profile.ts",
      'import Dashboard from "@/components/dashboard";',
    ],
  ])("rejects prohibited dependencies in %s", async (filePath, code) => {
    const results = await eslint.lintText(code, { filePath });
    expect(
      results[0].messages.some(
        (message) => message.ruleId === "no-restricted-imports",
      ),
    ).toBe(true);
  });
  it("allows query-client types in matching persistence", async () => {
    const results = await eslint.lintText(
      'import type { PoolClient } from "pg"; export type Queryable = Pick<PoolClient, "query">;',
      { filePath: "src/lib/matching-repository.ts" },
    );
    expect(results[0].errorCount).toBe(0);
  });
});
