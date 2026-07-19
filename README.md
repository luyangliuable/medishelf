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

The schema keeps the existing upload tables intact:

- `photo_submissions`
- `photo_submission_images`

NextAuth uses the app-owned `auth.users` table for credentials-based sign in. The app accepts `SESSION_SECRET` as the NextAuth secret so it matches DigitalOcean App Platform env var naming.

## DigitalOcean App Platform

Use a pre-deploy job for migrations instead of running `db:push` at web startup. The job should install dev dependencies because Drizzle Kit is a development dependency:

```bash
npm ci --include=dev && npm run do:predeploy
```

The pre-deploy script runs reviewed Drizzle migrations:

```bash
npm run db:migrate
```

Required App-Level environment variables:

- `DATABASE_URL`
- `SESSION_SECRET`
- `UPLOAD_DIR`
- `NEXT_PUBLIC_APP_URL`

Optional database TLS variables:

- `DATABASE_SSL_REJECT_UNAUTHORIZED=false` lets DigitalOcean managed Postgres connect when the runtime does not trust the database CA chain. The app keeps TLS enabled but normalizes `sslmode=require` before passing SSL options to `pg`.
- `DATABASE_CA_CERT` can be set to the managed database CA certificate to verify TLS instead.

Use `.do/app.yaml.example` as a starting point for an App Platform spec. Local filesystem uploads on App Platform are ephemeral, so use persistent object storage before relying on uploads in production.
