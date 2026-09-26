import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { routeTask, contextMetrics } from "../.agent/scripts/route.mjs";
import { evaluateRouting } from "../.agent/scripts/evaluate.mjs";
import { summarizeEvents } from "../.agent/scripts/metrics.mjs";
import { searchDocuments } from "../.agent/scripts/search.mjs";
import { findSymbol } from "../.agent/scripts/symbols.mjs";
import {
  allowedTools,
  callCapability,
  readCapabilities,
} from "../.agent/scripts/capabilities.mjs";
import { createMcpHandler } from "../.agent/scripts/mcp-server.mjs";
import { changeClaims } from "../.agent/scripts/coordination.mjs";
import { hookDecision } from "../.agent/scripts/lifecycle.mjs";
import { sourceHash } from "../.agent/scripts/context-check.mjs";

describe("local orchestration", () => {
  it("routes security and explanation work without executing it", () => {
    expect(routeTask("Review authentication")).toMatchObject({
      skill: "security-review",
      role: "reviewer",
      execute: false,
    });
    expect(routeTask("Explain database migrations").skill).toBe(
      "repo-discovery",
    );
    expect(routeTask("Delete production users").action_gate).toBe(
      "explicit-authorization-required",
    );
    expect(() => routeTask("x".repeat(10001))).toThrow();
    expect(() => contextMetrics([".env"])).toThrow();
  });
  it("fails evaluation when the observed route disagrees", () => {
    expect(
      evaluateRouting([
        {
          id: "failure",
          prompt: "Fix spacing",
          expected: { skill: "release" },
        },
      ])[0].passed,
    ).toBe(false);
    expect(
      evaluateRouting([
        { id: "missing", prompt: "", expected: { reject: true } },
      ])[0].passed,
    ).toBe(true);
  });
  it("reports observed metrics without inventing model usage", () => {
    expect(
      summarizeEvents([
        { event: "check_completed", exit_code: 1, duration_ms: 12 },
      ]),
    ).toMatchObject({
      failed_checks: 1,
      check_duration_ms: 12,
      actual_model_tokens: null,
    });
  });
  it("searches fresh documents, quotes query syntax and normalizes indexed text line endings", () => {
    const dir = mkdtempSync(join(tmpdir(), "jobradar-search-"));
    try {
      mkdirSync(join(dir, "docs"));
      const file = join(dir, "docs/a.md");
      writeFileSync(file, "# Matching\nCaller owned transactions\n");
      const original = sourceHash(file);
      expect(searchDocuments("transactions", dir)).toHaveLength(1);
      writeFileSync(file, "# Matching\r\nCaller owned transactions\r\n");
      expect(sourceHash(file)).toBe(original);
      writeFileSync(file, "# Replacement\n");
      expect(searchDocuments("transactions", dir)).toHaveLength(0);
      expect(searchDocuments('" OR *', dir)).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("uses the TypeScript language service to find a definition and references", () => {
    const dir = mkdtempSync(join(tmpdir(), "jobradar-symbol-"));
    try {
      mkdirSync(join(dir, "src"));
      writeFileSync(
        join(dir, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: { target: "ES2022" },
          include: ["src"],
        }),
      );
      writeFileSync(
        join(dir, "src/a.ts"),
        "export const count = 1;\nconsole.log(count);\n",
      );
      const result = findSymbol("src/a.ts", 2, 13, dir);
      expect(result.definitions.length).toBeGreaterThan(0);
      expect(result.references.length).toBeGreaterThan(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("rejects conflicting claims and requires the recorded owner for release", () => {
    const task = {
      task_id: "one",
      owner: "codex",
      status: "implementing",
      workspace: { worktree: "C:/one", claimed_files: ["src"] },
    };
    expect(() =>
      changeClaims(
        [task],
        { ...task, task_id: "two", owner: "claude" },
        "claim",
      ),
    ).toThrow();
    expect(() =>
      changeClaims([task], { ...task, owner: "claude" }, "release"),
    ).toThrow();
    expect(changeClaims([task], task, "release")).toEqual([]);
  });
  it("gates known destructive hook commands without capturing tool payloads", () => {
    expect(
      hookDecision({
        hook_event_name: "PreToolUse",
        tool_name: "Bash",
        tool_input: { command: "git push --force" },
      })?.hookSpecificOutput.permissionDecision,
    ).toBe("ask");
    expect(
      hookDecision({
        hook_event_name: "PreToolUse",
        tool_name: "Bash",
        tool_input: { command: "npm test" },
      }),
    ).toBeNull();
  });
});

describe("read-only capability boundary", () => {
  const registry = readCapabilities();
  it("hides disabled GitHub tools and denies role escalation", async () => {
    expect(
      allowedTools("implementer", registry).map(
        (t: { name: string }) => t.name,
      ),
    ).toEqual(["read_official_docs"]);
    await expect(
      callCapability("implementer", "read_issue", { number: 1 }, registry),
    ).rejects.toThrow();
    expect(() => allowedTools("admin", registry)).toThrow();
  });
  it("accepts only allowlisted GET targets and bounded responses", async () => {
    const fetcher = vi.fn(async () => new Response("Official reference"));
    await callCapability(
      "implementer",
      "read_official_docs",
      { topic: "node" },
      registry,
      fetcher,
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://nodejs.org/api/",
      expect.objectContaining({ method: "GET", redirect: "error" }),
    );
    await expect(
      callCapability(
        "implementer",
        "read_official_docs",
        { topic: "https://private.invalid" },
        registry,
        fetcher,
      ),
    ).rejects.toThrow();
    await expect(
      callCapability(
        "implementer",
        "read_official_docs",
        { topic: "node" },
        registry,
        async () => new Response("x".repeat(1000001)),
      ),
    ).rejects.toThrow("limit");
  });
  it("requires MCP initialization and never replies to notifications", async () => {
    const handler = createMcpHandler("implementer", registry);
    expect(
      await handler({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    ).toHaveProperty("error");
    expect(
      await handler({
        jsonrpc: "2.0",
        id: 2,
        method: "initialize",
        params: { protocolVersion: "2025-06-18" },
      }),
    ).toHaveProperty("result");
    expect(
      await handler({ jsonrpc: "2.0", method: "notifications/initialized" }),
    ).toBeNull();
    const result = await handler({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/list",
    });
    expect(
      result && "result" in result ? result.result.tools : [],
    ).toHaveLength(1);
    expect(
      await handler({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "read_issue", arguments: { number: 1 } },
      }),
    ).toMatchObject({ result: { isError: true } });
  });
});
