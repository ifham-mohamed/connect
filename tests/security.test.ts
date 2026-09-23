import { describe, expect, it } from "vitest";
import { readJsonBody } from "../src/lib/request-body";
import { safeUrl } from "../src/lib/matching";

describe("security boundaries", () => {
  it("accepts bounded JSON and rejects non-JSON input", async () => {
    await expect(
      readJsonBody(
        new Request("https://jobradar.test/api/test", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ok: true }),
        }),
        100,
      ),
    ).resolves.toEqual({ ok: true });
    await expect(
      readJsonBody(
        new Request("https://jobradar.test/api/test", {
          method: "POST",
          headers: { "content-type": "text/plain" },
          body: "{}",
        }),
        100,
      ),
    ).rejects.toMatchObject({ status: 415 });
  });

  it("rejects oversized bodies even without a content-length header", async () => {
    const request = new Request("https://jobradar.test/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(200) }),
    });
    request.headers.delete("content-length");
    await expect(readJsonBody(request, 50)).rejects.toMatchObject({
      status: 413,
    });
  });

  it("allows only HTTP links at the rendering boundary", () => {
    expect(safeUrl("javascript:alert(document.cookie)")).toBe("");
    expect(safeUrl("data:text/html,<script>alert(1)</script>")).toBe("");
    expect(safeUrl("https://example.com/jobs/1")).toBe(
      "https://example.com/jobs/1",
    );
  });
});
