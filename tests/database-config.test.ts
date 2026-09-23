import { describe, it, expect, vi } from "vitest";
import { databaseConfig } from "../src/lib/database-config";
import { connectDatabase, withDatabaseRetry } from "../src/lib/db";
import type { PoolClient } from "pg";
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
  it("allows concurrent browser requests while keeping the pool bounded", () => {
    expect(
      databaseConfig({
        DATABASE_URL: "postgres://jobradar:jobradar@localhost/db",
      }).max,
    ).toBe(1);
    expect(
      databaseConfig({
        DATABASE_URL: "postgres://jobradar:jobradar@localhost/db",
        DATABASE_POOL_MAX: "50",
      }).max,
    ).toBe(10);
  });
  it("retries one transient terminated connection", async () => {
    const client = { release: vi.fn() } as unknown as PoolClient;
    const connect = vi
      .fn<() => Promise<PoolClient>>()
      .mockRejectedValueOnce(
        new Error("Connection terminated due to connection timeout"),
      )
      .mockResolvedValueOnce(client);

    await expect(connectDatabase({ connect }, 0)).resolves.toBe(client);
    expect(connect).toHaveBeenCalledTimes(2);
  });
  it("does not retry permanent database errors", async () => {
    const error = Object.assign(new Error("password authentication failed"), {
      code: "28P01",
    });
    const connect = vi.fn<() => Promise<PoolClient>>().mockRejectedValue(error);

    await expect(connectDatabase({ connect }, 0)).rejects.toBe(error);
    expect(connect).toHaveBeenCalledTimes(1);
  });
  it("replays an idempotent read on a fresh client after a dropped query", async () => {
    const first = { release: vi.fn() } as unknown as PoolClient;
    const second = { release: vi.fn() } as unknown as PoolClient;
    const connect = vi
      .fn<() => Promise<PoolClient>>()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);
    const read = vi
      .fn<(client: PoolClient) => Promise<string>>()
      .mockRejectedValueOnce(new Error("Connection terminated unexpectedly"))
      .mockResolvedValueOnce("ready");

    await expect(withDatabaseRetry(read, { connect }, 0)).resolves.toBe(
      "ready",
    );
    expect(read).toHaveBeenCalledTimes(2);
    expect(first.release).toHaveBeenCalledWith(expect.any(Error));
    expect(second.release).toHaveBeenCalledWith();
  });
});
