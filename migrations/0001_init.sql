CREATE TABLE users (
  username TEXT PRIMARY KEY NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE documents (
  username TEXT NOT NULL,
  document TEXT NOT NULL,
  progress TEXT NOT NULL,
  percentage REAL NOT NULL,
  device TEXT NOT NULL,
  device_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  filename TEXT,
  title TEXT,
  authors TEXT,
  PRIMARY KEY (username, document),
  FOREIGN KEY (username) REFERENCES users(username)
);

CREATE INDEX idx_documents_user_ts ON documents(username, timestamp DESC);
