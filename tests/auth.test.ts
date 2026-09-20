import { afterEach, describe, expect, it, vi } from "vitest";
import { createSession, equalSecret, validSession } from "../src/lib/auth";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
describe("owner authentication", () => {
  it("accepts a valid session but rejects tampering and rotated secrets", () => {
    vi.stubEnv("SESSION_SECRET", "a".repeat(40));
    const token = createSession();
    expect(validSession(token)).toBe(true);
    expect(validSession(token + "0")).toBe(false);
    expect(validSession(token + ".extra")).toBe(false);
    vi.stubEnv("SESSION_SECRET", "b".repeat(40));
    expect(validSession(token)).toBe(false);
  });
  it("rejects expired sessions and short signing secrets", () => {
    vi.stubEnv("SESSION_SECRET", "a".repeat(40));
    vi.useFakeTimers();
    const token = createSession();
    vi.advanceTimersByTime(13 * 3600000);
    expect(validSession(token)).toBe(false);
    vi.stubEnv("SESSION_SECRET", "short");
    expect(() => createSession()).toThrow();
  });
  it("compares secrets without accepting a prefix", () => {
    expect(equalSecret("correct", "correct")).toBe(true);
    expect(equalSecret("correct", "correc")).toBe(false);
    expect(equalSecret("correct", "incorrect")).toBe(false);
  });
});
