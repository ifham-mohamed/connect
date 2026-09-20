import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
export function equalSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function sign(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Set a SESSION_SECRET of at least 32 characters");
  return createHmac("sha256", secret).update(value).digest("hex");
}
export function createSession() {
  const expires = String(Date.now() + 12 * 3600000);
  return `${expires}.${sign(expires)}`;
}
export function validSession(token: string) {
  if (token.split(".").length !== 2) return false;
  const [expires, signature] = token.split(".");
  if (
    !expires ||
    !signature ||
    !/^\d+$/.test(expires) ||
    Number(expires) < Date.now()
  )
    return false;
  try {
    return equalSecret(signature, sign(expires));
  } catch {
    return false;
  }
}
export async function authenticated() {
  return validSession((await cookies()).get("jobradar_session")?.value || "");
}
export async function authorizeWrite(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(process.env.APP_URL || request.url).origin)
    throw new Error("FORBIDDEN");
  if (!(await authenticated())) throw new Error("UNAUTHORIZED");
}
