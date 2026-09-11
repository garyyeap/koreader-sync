import { Hono } from "hono";
import { requireAuth } from "../auth";
import { toProgressResponse } from "../db";
import type { DocumentRow, Env, ProgressPayload, UserRow } from "../types";

type AppEnv = { Bindings: Env; Variables: { user: UserRow } };

export const syncs = new Hono<AppEnv>();

syncs.use("*", requireAuth);

/**
 * PUT /syncs/progress
 * Upsert reading progress for the authenticated user.
 */
syncs.put("/progress", async (c) => {
  let body: ProgressPayload;
  try {
    body = await c.req.json<ProgressPayload>();
  } catch {
    return c.json({ message: "Invalid request" }, 400);
  }

  const { document, progress, percentage, device, device_id, metadata } = body;

  if (
    typeof document !== "string" ||
    !document ||
    typeof progress !== "string" ||
    typeof percentage !== "number" ||
    typeof device !== "string" ||
    typeof device_id !== "string"
  ) {
    return c.json({ message: "Invalid request" }, 400);
  }

  const user = c.get("user");
  const timestamp = Math.floor(Date.now() / 1000);
  const filename = metadata?.filename ?? null;
  const title = metadata?.title ?? null;
  const authors = metadata?.authors ?? null;

  // Preserve prior metadata columns when the client omits metadata.
  await c.env.DB.prepare(
    `INSERT INTO documents (
      username, document, progress, percentage, device, device_id, timestamp,
      filename, title, authors
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(username, document) DO UPDATE SET
      progress = excluded.progress,
      percentage = excluded.percentage,
      device = excluded.device,
      device_id = excluded.device_id,
      timestamp = excluded.timestamp,
      filename = COALESCE(excluded.filename, documents.filename),
      title = COALESCE(excluded.title, documents.title),
      authors = COALESCE(excluded.authors, documents.authors)`,
  )
    .bind(
      user.username,
      document,
      progress,
      percentage,
      device,
      device_id,
      timestamp,
      filename,
      title,
      authors,
    )
    .run();

  return c.json(
    {
      document,
      progress,
      percentage,
      device,
      device_id,
      timestamp,
    },
    200,
  );
});

/**
 * GET /syncs/progress/:document
 * Missing progress → 200 + {} (community-server compatible).
 */
syncs.get("/progress/:document", async (c) => {
  const document = c.req.param("document");
  const user = c.get("user");

  const row = await c.env.DB.prepare(
    `SELECT username, document, progress, percentage, device, device_id,
            timestamp, filename, title, authors
     FROM documents
     WHERE username = ? AND document = ?`,
  )
    .bind(user.username, document)
    .first<DocumentRow>();

  if (!row) {
    return c.json({}, 200);
  }

  return c.json(toProgressResponse(row), 200);
});
