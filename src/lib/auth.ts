import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import type { Pool, PoolClient } from "pg";
import { db } from "./db";

const scrypt = promisify(scryptCallback);
export const sessionCookie = "jobradar_session";
export const sessionMaxAge = 7 * 24 * 60 * 60;

export type UserRole = "owner" | "member";
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
type Queryable = Pick<Pool | PoolClient, "query">;

export function equalSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, encoded] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !encoded) return false;
  try {
    const expected = Buffer.from(encoded, "hex");
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}
export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export async function setSessionCookie(token: string) {
  (await cookies()).set(sessionCookie, token, {
    httpOnly: true,
    secure: process.env.APP_URL?.startsWith("https://") ?? false,
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAge,
  });
}
export async function clearSessionCookie() {
  (await cookies()).delete(sessionCookie);
}
export async function currentSessionToken() {
  return (await cookies()).get(sessionCookie)?.value || "";
}
export async function currentUser(
  queryable: Queryable = db(),
): Promise<AuthUser | null> {
  const token = await currentSessionToken();
  if (!token) return null;
  const result = await queryable.query<AuthUser>(
    `SELECT u.id, u.name, u.email, u.role
       FROM user_sessions s JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=$1 AND s.expires_at>now() LIMIT 1`,
    [hashSessionToken(token)],
  );
  return result.rows[0] || null;
}

export function originAllowed(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(
    origin && origin === new URL(process.env.APP_URL || request.url).origin,
  );
}
export async function authorizeWrite(
  request: Request,
  requiredRole: UserRole = "member",
) {
  if (!originAllowed(request)) throw new Error("FORBIDDEN");
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  if (requiredRole === "owner" && user.role !== "owner")
    throw new Error("OWNER_REQUIRED");
  return user;
}
