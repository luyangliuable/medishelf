# MediShelf

Mobile-first Next.js app for MediShelf photo uploads.

## Run the app

```bash
npm install
npm run dev
```

## Local Supabase

Docker is required. Start Supabase without Homebrew:

```bash
npm run supabase:start
```

Copy `.env.local.example` to `.env.local` and replace the key with the Publishable key from `supabase status`.

The local migration creates:

- `photo_submissions`
- `photo_submission_images`
- public storage bucket `mp-images`

Stop local Supabase:

```bash
npm run supabase:stop
```
