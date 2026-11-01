# MediShelf

Mobile-first Next.js app for MediShelf photo uploads.

## Run with Docker

Docker Compose starts the Next.js frontend and PostgreSQL:

```bash
docker compose up --build
```

Open `http://localhost:3000`.

PostgreSQL data is stored in the `pgdata` volume. Uploaded photos are stored in the `uploads` volume.

To stop the stack:

```bash
docker compose down
```

To reset all local database and upload data:

```bash
docker compose down -v
```

## Run locally without Docker

Start a PostgreSQL database, copy `.env.local.example` to `.env.local`, then update `DATABASE_URL`, `SESSION_SECRET`, and `NEXT_PUBLIC_APP_URL`.

```bash
npm install
npm run dev
```

## Database

Drizzle defines the application schema in `lib/database/schema`.

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
```

Drizzle Kit is the only supported schema-management path. Make schema changes in
`lib/database/schema`, generate a migration, then apply it:

```bash
npm run db:generate -- --name descriptive-migration-name
npm run db:migrate
```

The migration history creates these upload tables:

- `photo_submissions`
- `photo_submission_images`

NextAuth uses the app-owned `public.users` table for credentials-based sign in.
The app accepts `SESSION_SECRET` as the NextAuth secret so it matches DigitalOcean
App Platform env var naming.

Each labelled product batch contains four to twelve images with a 40 MB combined
upload limit. The configured vision model extracts product name, manufacturer,
barcode/GTIN, size, manufacture date, expiration date, lot, reference,
manufacturer address, and manufacturer site.
Unreadable or ambiguous values are stored as `NULL` and displayed as `Not detected`.
Unambiguous manufacture and expiration values are stored as PostgreSQL dates.

## Code reader

Alongside the vision model, every batch goes through a code reader (`lib/server/codeReader`)
that decodes GS1 DataMatrix, QR (including GS1 Digital Link), EAN/UPC, GS1-128 and similar codes
with ZXing-C++. A GS1 code can establish the GTIN, lot, expiry and manufacture date exactly,
including when the printed text is smudged or the date is ambiguous.

1. A plain scan of each photo runs first (no model calls).
2. If it finds no GS1 lot or expiry, a vision agent (Vercel AI SDK `ToolLoopAgent`) looks at the
   photos and calls a `decodeRegion` tool on anything that looks like a code. Only values the
   decoder returns are used; the model never reads digits itself.
3. Decoded values fill empty fields and confirm matching ones. When a decoded value and the
   printed reading disagree, the field is left empty, unless the printed GTIN fails its check
   digit, in which case the decoded one is used.

Optional settings:

| Variable | Default | Purpose |
| --- | --- | --- |
| `CODE_AGENT_ENABLED` | `true` | Set `false` to use the plain scan only |
| `CODE_LOCATOR_MODEL` | `LLM_MODEL` | Vision model the agent uses to locate codes |
| `CODE_AGENT_MAX_STEPS` | `6` | Agent step limit (1 to 20) |
| `CODE_CONFLICT_POLICY` | `empty` | `prefer-code` trusts the decoded value on a disagreement |

Each analysis logs which codes were found and where every code-backed field came from.
Run the tests with `npm test`.

## Serving under a path prefix

Set `NEXT_PUBLIC_BASE_PATH` (for example `/new`) to serve the app under a path, such as
`https://medishelf.net/new` behind the medishelf.net router. It must be set at both build time
and run time, and `NEXT_PUBLIC_APP_URL` should include the prefix:

```bash
NEXT_PUBLIC_BASE_PATH=/new
NEXT_PUBLIC_APP_URL=https://medishelf.net/new
```

Leave it unset to serve from the root. Next.js prefixes `<Link>`, `redirect()` and router
navigation itself; anything else that builds an app path (`fetch`, plain anchors, `next/image`
sources, next-auth URLs) goes through `withBasePath()` from `lib/basePath.ts`. Session cookies are
scoped to the prefix so other apps on the same domain never receive them.

## DigitalOcean App Platform

Use a pre-deploy job for migrations instead of running `db:push` at web startup. The job should install dev dependencies because Drizzle Kit is a development dependency:

```bash
npm ci --include=dev && npm run do:predeploy
```

The pre-deploy script applies the tracked Drizzle migrations before the web service starts:

```bash
npm run do:predeploy
```

Required App-Level environment variables:

- `DATABASE_URL`
- `SESSION_SECRET`
- `UPLOAD_DIR`
- `NEXT_PUBLIC_APP_URL`

To enable AI product-label extraction, configure:

- `LLM_PROVIDER` (`azure`, `openai-compatible`, or `anthropic`)
- `LLM_BASE_URL`
- `LLM_MODEL`

Optional LLM environment variables:

- `LLM_API_KEY`
- `LLM_HEADERS_JSON`
- `LLM_AZURE_USE_BEARER_AUTH=true` when an Azure provider request is sent through a gateway that authenticates with `Authorization: Bearer`.
- `NODE_EXTRA_CA_CERTS=/path/to/gateway-ca.pem` when the vision gateway uses a private CA that is not already trusted by the runtime. The local `npm run dev` and production `npm start` commands use the system CA store without disabling certificate validation.

Optional database TLS variables:

- `DATABASE_SSL_REJECT_UNAUTHORIZED=false` lets DigitalOcean managed Postgres connect when the runtime does not trust the database CA chain. The app keeps TLS enabled but normalizes `sslmode=require` before passing SSL options to `pg`.
- `DATABASE_CA_CERT` can be set to the managed database CA certificate to verify TLS instead.

Use `.do/app.yaml.example` as a starting point for an App Platform spec. Local filesystem uploads on App Platform are ephemeral, so use persistent object storage before relying on uploads in production.
