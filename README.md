# Collazzi Invitation

Single-event invitation site inspired by the supplied Paperless Post screenshots and PDF.

## Stack

- Next.js 15 App Router
- TypeScript + Tailwind CSS
- Drizzle schema for Supabase/Postgres
- Resend + Twilio provider adapters with sandbox fallback
- File-backed local mock store for development

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Preview Routes

- Guest previews: `/i/preview-couple`, `/i/preview-solo`, `/i/preview-family`
- Host login: `/host/login`

Mock host emails:

- `alessandro@collazzi.host`
- `sister@collazzi.host`

## Scripts

```bash
npm run lint
npm run test
npm run test:e2e
npm run db:generate
```
