export type Env = {
  DB: D1Database;
  /** SHA-256 pepper for stored password hashes. Set via `wrangler secret put PASSWORD_PEPPER`. */
  PASSWORD_PEPPER: string;
  /** "true" | "false" — disable after creating your account(s). */
  REGISTRATION_ENABLED: string;
  /** Optional. If set, POST /users/create requires header X-Registration-Secret. */
  REGISTRATION_SECRET?: string;
};

export type UserRow = {
  username: string;
  password_hash: string;
  created_at: number;
};

export type DocumentRow = {
  username: string;
  document: string;
  progress: string;
  percentage: number;
  device: string;
  device_id: string;
  timestamp: number;
  filename: string | null;
  title: string | null;
  authors: string | null;
};

export type ProgressPayload = {
  document: string;
  progress: string;
  percentage: number;
  device: string;
  device_id: string;
  metadata?: {
    filename?: string;
    title?: string;
    authors?: string;
  };
};

export type ProgressResponse = {
  document: string;
  progress: string;
  percentage: number;
  device: string;
  device_id: string;
  timestamp: number;
};
