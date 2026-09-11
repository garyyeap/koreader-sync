# KOReader Sync Worker

Personal KOReader progress-sync API on **Cloudflare Workers + D1**.

Compatible with KOReader’s Progress Sync plugin (`Accept: application/vnd.koreader.v1+json`).

## One-click deploy

Click the button below to deploy your own instance directly to Cloudflare Workers:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/garyyeap/koreader-sync-worker)

During deploy you will be prompted for:
- **PASSWORD_PEPPER** (required) — e.g. `openssl rand -hex 32`
- D1 database (created automatically)
- Migrations run via `npm run deploy`

Optional later (dashboard or CLI): `wrangler secret put REGISTRATION_SECRET` to gate `POST /users/create`.

After first Register in KOReader, set `REGISTRATION_ENABLED=false` in the Worker settings and redeploy (or edit in the dashboard).

## Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| `POST` | `/users/create` | none* | Register (`password` = MD5 hex). `201` / `402` taken / `403` disabled |
| `GET` | `/users/auth` | `X-Auth-User` + `X-Auth-Key` | Login check |
| `PUT` | `/syncs/progress` | same | Upsert progress |
| `GET` | `/syncs/progress/:document` | same | Fetch progress (`{}` if none) |
| `GET` | `/health` | none | Deploy check |

\*If `REGISTRATION_SECRET` is set, create also needs header `X-Registration-Secret`.

## Manual setup

### 1. Install

```bash
npm install
```

### 2. Create D1 and wire `wrangler.toml`

```bash
npx wrangler d1 create koreader-sync
```

Paste the returned `database_id` into `wrangler.toml` (replace the placeholder).

### 3. Migrate

```bash
npm run db:migrate:local
npm run db:migrate:remote
```

### 4. Secrets

```bash
# Required — long random string used when hashing stored passwords
npx wrangler secret put PASSWORD_PEPPER

# Optional — if set, KOReader Register will fail unless you create users via curl
npx wrangler secret put REGISTRATION_SECRET
```

For local dev, copy `.dev.vars.example` → `.dev.vars` and fill in values:

```bash
cp .dev.vars.example .dev.vars
```

### 5. Run / deploy

```bash
npm run dev      # local
npm run deploy   # applies D1 migrations + deploys Worker
```

### 6. Lock registration (recommended)

After creating your account(s), set in `wrangler.toml` or the dashboard:

```toml
[vars]
REGISTRATION_ENABLED = "false"
```

Redeploy so public Register is closed.

## KOReader

1. Progress sync → **Custom sync server** → your Worker URL  
   (e.g. `https://koreader-sync.<account>.workers.dev/`)
2. **Register** once (while registration is enabled), or Login if the user already exists.
3. Enable auto sync if you want.

KOReader sends `MD5(password)` as `password` / `X-Auth-Key`. The Worker stores `SHA-256(pepper + md5)`, never the plaintext password.

### Create user with curl (when `REGISTRATION_SECRET` is set)

```bash
# password field must be MD5 of the real password
KEY=$(echo -n 'yourpassword' | md5)   # macOS; on Linux use md5sum | cut -d' ' -f1

curl -X POST "https://YOUR_WORKER/users/create" \
  -H "Content-Type: application/json" \
  -H "X-Registration-Secret: YOUR_SECRET" \
  -d "{\"username\":\"gary\",\"password\":\"$KEY\"}"
```

## Local smoke test

```bash
npm run dev
# in another terminal (PASSWORD_PEPPER must match .dev.vars)
KEY=$(echo -n 'secret' | md5)

curl -s -X POST http://127.0.0.1:8787/users/create \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"gary\",\"password\":\"$KEY\"}"

curl -s http://127.0.0.1:8787/users/auth \
  -H "X-Auth-User: gary" \
  -H "X-Auth-Key: $KEY"
```

## Notes

- Conflict policy: **last write wins** (server `timestamp`).
- Optional `metadata` (`filename`, `title`, `authors`) is stored when KOReader sends it; omitted fields keep previous values.
