import { Hono } from "hono";
import { hashPassword, requireAuth, timingSafeEqual } from "../auth";
import type { Env, UserRow } from "../types";

type AppEnv = { Bindings: Env; Variables: { user: UserRow } };

export const users = new Hono<AppEnv>();

/**
 * POST /users/create
 * Body: { username, password } — password is already MD5(hex) from KOReader.
 * Status: 201 created | 402 username taken | 403 registration disabled/forbidden
 */
users.post("/create", async (c) => {
  if (c.env.REGISTRATION_ENABLED !== "true") {
    return c.json({ message: "Registration is disabled." }, 403);
  }

  const secret = c.env.REGISTRATION_SECRET;
  if (secret) {
    const provided = c.req.header("x-registration-secret") ?? "";
    if (!timingSafeEqual(provided, secret)) {
      return c.json({ message: "Forbidden" }, 403);
    }
  }

  const pepper = c.env.PASSWORD_PEPPER;
  if (!pepper) {
    return c.json({ message: "Server misconfigured: PASSWORD_PEPPER" }, 500);
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ message: "Invalid request" }, 403);
  }

  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const password =
    typeof body.password === "string" ? body.password.trim() : "";

  if (!username || !password) {
    return c.json({ message: "Invalid request" }, 403);
  }

  const existing = await c.env.DB.prepare(
    "SELECT username FROM users WHERE username = ?",
  )
    .bind(username)
    .first();

  // KOReader api.json expects 402 when the username is already registered.
  if (existing) {
    return c.json({ message: "Username is already registered." }, 402);
  }

  const password_hash = await hashPassword(pepper, password);
  const created_at = Math.floor(Date.now() / 1000);

  try {
    await c.env.DB.prepare(
      "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
    )
      .bind(username, password_hash, created_at)
      .run();
  } catch (err) {
    // Race: unique constraint
    console.error("register insert failed", err);
    return c.json({ message: "Username is already registered." }, 402);
  }

  return c.json({ username }, 201);
});

/** GET /users/auth — Login check used by KOReader. */
users.get("/auth", requireAuth, (c) => {
  return c.json({ authorized: "OK" }, 200);
});
