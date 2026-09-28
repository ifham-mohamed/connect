import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import type { Pool, PoolClient } from "pg";

type Queryable = Pick<Pool | PoolClient, "query">;

function encryptionKey() {
  const secret = process.env.JEV_USER_KEY_ENCRYPTION_SECRET?.trim();
  if (!secret || secret.length < 32)
    throw new Error("JEV_KEY_ENCRYPTION_NOT_CONFIGURED");
  return createHash("sha256").update(secret).digest();
}

export function encryptUserJevApiKey(apiKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final(),
  ]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptUserJevApiKey(value: string) {
  const [version, encodedIv, encodedTag, encodedCiphertext] = value.split(".");
  if (version !== "v1" || !encodedIv || !encodedTag || !encodedCiphertext)
    throw new Error("Invalid stored JEV API key.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function getUserJevApiKey(queryable: Queryable, userId: string) {
  const result = await queryable.query<{ encrypted: string | null }>(
    "SELECT jev_api_key_encrypted AS encrypted FROM users WHERE id=$1",
    [userId],
  );
  const encrypted = result.rows[0]?.encrypted;
  return encrypted ? decryptUserJevApiKey(encrypted) : null;
}
