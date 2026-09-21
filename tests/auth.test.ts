import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  equalSecret,
  hashPassword,
  hashSessionToken,
  originAllowed,
  verifyPassword,
} from "../src/lib/auth";

describe("account authentication", () => {
  it("hashes passwords with unique salts and verifies only the original", async () => {
    const first = await hashPassword("correct-horse-123");
    const second = await hashPassword("correct-horse-123");
    expect(first).not.toBe(second);
    expect(await verifyPassword("correct-horse-123", first)).toBe(true);
    expect(await verifyPassword("incorrect-horse-123", first)).toBe(false);
    expect(await verifyPassword("correct-horse-123", "invalid")).toBe(false);
  });

  it("creates opaque session tokens and stable non-reversible hashes", () => {
    const token = createSessionToken();
    expect(token.length).toBeGreaterThan(32);
    expect(hashSessionToken(token)).toHaveLength(64);
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toContain(token);
  });

  it("compares secrets without accepting a prefix", () => {
    expect(equalSecret("correct", "correct")).toBe(true);
    expect(equalSecret("correct", "correc")).toBe(false);
    expect(equalSecret("correct", "incorrect")).toBe(false);
  });

  it("accepts only the configured same origin for mutations", () => {
    const sameOrigin = new Request("https://jobradar.test/api/auth", {
      headers: { origin: "https://jobradar.test" },
    });
    const otherOrigin = new Request("https://jobradar.test/api/auth", {
      headers: { origin: "https://attacker.test" },
    });
    expect(originAllowed(sameOrigin)).toBe(true);
    expect(originAllowed(otherOrigin)).toBe(false);
  });
});
