# Collazzi Invitation

Single-event invitation site inspired by the supplied Paperless Post screenshots and PDF.

## Stack

- Next.js 15 App Router
- TypeScript + Tailwind CSS
- Drizzle schema for Supabase/Postgres
- Optional Google Sheets guest and RSVP store
- Resend + Twilio provider adapters with sandbox fallback
- File-backed local mock store for development

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Routes

- `/` redirects to `/host/login`.
- Guest invitations are available only at private `/i/<token>` links.
- Host login: `/host/login`

Local host email:

- `bona18ale20@gmail.com`

## Google Sheets RSVP Store

When `GOOGLE_SHEETS_ID`, either `GOOGLE_SHEETS_GID` or `GOOGLE_SHEETS_TAB`, and either
`GOOGLE_SERVICE_ACCOUNT_KEY_PATH` or `GOOGLE_SERVICE_ACCOUNT_EMAIL` plus `GOOGLE_PRIVATE_KEY` are
configured, guest and RSVP data are read from Google Sheets instead of `.data/mock-state.json`.

Share the spreadsheet with the service account email. The app normalizes the guest header row,
generates missing `guest_id`, `token`, and `invite_url` values, writes RSVP columns from `/api/rsvp`,
applies checkbox validation to boolean columns when Google Sheets allows it, and appends operational
events to an `Activity` tab.

The guest tab supports the existing Collazzi headings and normalizes them to machine-readable
columns such as `last_name`, `first_name`, `email`, `coming_to_walking_dinner`, `coming_to_party`,
`transfer_needed`, and `not_coming`. The `will_invite_to_walking_dinner` checkbox controls whether a
guest sees the Thursday dinner section and walking dinner RSVP question. The app also uses
`token_active` and `provider_message_id` for private-link and delivery webhook handling.

## Deployment

1. Create a Google Cloud service account, enable Google Sheets API access, and create a JSON key.
2. Share the RSVP spreadsheet with the service account `client_email` as an editor.
3. In Vercel, import this repository as a Next.js project.
4. Add production environment variables:
   - `APP_URL=https://your-domain.example`
   - `HOST_PASSWORD=<strong host dashboard password>`
   - `GOOGLE_SHEETS_ID=1nwMdtzs0VdhjJOSHdm45tyoHKuvh3_Md4Zw1hUArPnY`
   - `GOOGLE_SHEETS_GID=1950973940` or `GOOGLE_SHEETS_TAB=<tab name>`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL=<client_email from JSON key>`
   - `GOOGLE_PRIVATE_KEY=<private_key from JSON key, preserving newline escapes>`
   - Optional delivery variables: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `TWILIO_ACCOUNT_SID`,
     `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_PHONE`
5. Deploy, then set `APP_URL` to the final production URL or custom domain and redeploy.
6. Open `/host/login`, confirm the guest list loads from Sheets, then open one `/i/<token>` link and
   submit a test RSVP before sending real invitations.

## Scripts

```bash
npm run lint
npm run test
npm run test:e2e
npm run db:generate
```
