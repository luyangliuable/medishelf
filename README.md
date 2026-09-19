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
