import { describe, it, expect } from "vitest";
import { databaseConfig } from "../src/lib/database-config";
describe("database connection configuration", () => {
  it("rejects placeholders before connecting", () => {
    expect(() =>
      databaseConfig({
        DATABASE_URL: "postgres://avnadmin:password@example.com/db",
      }),
    ).toThrow("placeholder");
  });
  it("verifies remote TLS regardless of insecure URL options", () => {
    const config = databaseConfig({
      DATABASE_URL:
        "postgres://user:real-secret@example.com/db?sslmode=disable",
    });
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
    expect(config.connectionString).not.toContain("sslmode");
  });
  it("supports a provider CA and local development", () => {
    expect(
      databaseConfig({
        DATABASE_URL: "postgres://user:real-secret@example.com/db",
        DATABASE_CA_CERT: "CA\\nCERT",
      }).ssl,
    ).toEqual({ rejectUnauthorized: true, ca: "CA\nCERT" });
    expect(
      databaseConfig({
        DATABASE_URL: "postgres://jobradar:jobradar@localhost/db",
      }).ssl,
    ).toBeUndefined();
  });
});
