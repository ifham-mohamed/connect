import { afterEach, describe, expect, it } from "vitest";
import {
  decryptUserJevApiKey,
  encryptUserJevApiKey,
} from "../src/lib/user-jev-key";

describe("user JEV API key protection", () => {
  const previous = process.env.JEV_USER_KEY_ENCRYPTION_SECRET;

  afterEach(() => {
    if (previous === undefined)
      delete process.env.JEV_USER_KEY_ENCRYPTION_SECRET;
    else process.env.JEV_USER_KEY_ENCRYPTION_SECRET = previous;
  });

  it("encrypts and decrypts without exposing the original key", () => {
    process.env.JEV_USER_KEY_ENCRYPTION_SECRET = "a".repeat(32);
    const encrypted = encryptUserJevApiKey("jev-secret-value");
    expect(encrypted).not.toContain("jev-secret-value");
    expect(decryptUserJevApiKey(encrypted)).toBe("jev-secret-value");
  });

  it("requires a deployment encryption secret", () => {
    delete process.env.JEV_USER_KEY_ENCRYPTION_SECRET;
    expect(() => encryptUserJevApiKey("jev-secret-value")).toThrow(
      "JEV_KEY_ENCRYPTION_NOT_CONFIGURED",
    );
  });
});
