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

Start a PostgreSQL database, copy `.env.local.example` to `.env.local`, then update `DATABASE_URL`.

```bash
npm install
npm run dev
```

The database init scripts in `db/init` create the auth compatibility schema, the unchanged upload tables, and the local storage bucket record.
