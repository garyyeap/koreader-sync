import type { Context, Next } from "hono";
import type { Env, UserRow } from "./types";

type AppEnv = { Bindings: Env; Variables: { user: UserRow } };

/** SHA-256 hex of pepper + client MD5 key. */
export async function hashPassword(
  pepper: string,
  userkey: string,
): Promise<string> {
  const data = new TextEncoder().encode(`${pepper}:${userkey}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time string compare (equal length required by caller). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export function getAuthHeaders(c: Context<AppEnv>): {
  username: string;
  userkey: string;
} | null {
  const username = c.req.header("x-auth-user")?.trim() ?? "";
  const userkey = c.req.header("x-auth-key")?.trim() ?? "";
  if (!username || !userkey) return null;
  return { username, userkey };
}

export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const headers = getAuthHeaders(c);
  if (!headers) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const pepper = c.env.PASSWORD_PEPPER;
  if (!pepper) {
    return c.json({ message: "Server misconfigured: PASSWORD_PEPPER" }, 500);
  }

  const user = await c.env.DB.prepare(
    "SELECT username, password_hash, created_at FROM users WHERE username = ?",
  )
    .bind(headers.username)
    .first<UserRow>();

  if (!user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const candidate = await hashPassword(pepper, headers.userkey);
  if (!timingSafeEqual(candidate, user.password_hash)) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  c.set("user", user);
  await next();
}
