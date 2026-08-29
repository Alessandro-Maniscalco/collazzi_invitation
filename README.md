# Collazzi Invitation

A working event invitation, RSVP, host dashboard, check-in, and seating-planner site built for one real party.

This repository is public so it can be copied, forked, and adapted for another event:

- [GitHub repository](https://github.com/Alessandro-Maniscalco/collazzi_invitation)
- [Download the sanitized Google Sheets template](docs/Collazzi-Sheets-Template.xlsx)
- [LLM handoff and customization map](docs/LLM-HANDOFF.md)

The template contains no real guests, emails, invitation tokens, or RSVP data. Upload it to Google Drive and open it with Google Sheets before connecting a copied app.

> Honest warning: the spreadsheet columns were added gradually as new event needs appeared. The system works, but looking back, a new version could be organized much better by separating guests, invitation parties, RSVPs, delivery, check-in, and seating into their own tables. Compatibility with the working event took priority over a clean data model.

## What it includes

- Private invitation links at `/i/<token>`
- RSVP and transfer responses
- Email invitation delivery through Resend
- PIN/password-protected host, check-in, and seating pages
- Google Sheets as the live guest database
- Individual guest check-in
- Fifteen editable ten-seat tables with drag/drop seating
- A local mock data fallback for development

## Stack

- Next.js 15 App Router
- React 19 and TypeScript
- Google Sheets API
- Resend
- Optional Supabase/Postgres schema through Drizzle
- Vitest and Playwright

## Quick start

```bash
git clone https://github.com/Alessandro-Maniscalco/collazzi_invitation.git
cd collazzi_invitation
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000/host/login`.

Without Google Sheets credentials, development uses the local mock store. Set a strong `HOST_PASSWORD` and `CHECKIN_PIN` in `.env.local` before testing protected pages.

## Use the Sheets template

1. [Download the blank template](docs/Collazzi-Sheets-Template.xlsx).
2. Upload it to Google Drive and choose **Open with Google Sheets**.
3. Share the new spreadsheet with your Google Cloud service-account email as an editor.
4. Keep the tabs named `Lista`, `Seating Tables`, and `Activity`.
5. Keep the machine-readable `Lista` headers on row 3 and add invitations from row 4.
6. Put the spreadsheet ID and the `Lista` tab name or gid in the environment variables below.

The workbook also contains a `Setup Notes` tab. `Lista` stores one invitation party per row; an optional second named guest stays on the same row. The application can generate missing `guest_id`, `token`, and `invite_url` values.

Boolean fields use `TRUE`/`FALSE`. Google Sheets checkboxes are optional because their stored values are also booleans.

## Environment

Copy `.env.example` to `.env.local`. The main production variables are:

```dotenv
APP_URL=https://your-domain.example
HOST_PASSWORD=<strong host password>
CHECKIN_PIN=<door staff pin>
CHECKIN_SESSION_SECRET=<long random secret>

GOOGLE_SHEETS_ID=<spreadsheet id>
GOOGLE_SHEETS_TAB=Lista
GOOGLE_SERVICE_ACCOUNT_EMAIL=<service account email>
GOOGLE_PRIVATE_KEY=<private key with preserved newline escapes>

RESEND_API_KEY=<optional resend key>
RESEND_FROM_EMAIL=Your Event <invites@your-verified-domain.example>
RESEND_REPLY_TO_EMAIL=<reply-to address>
```

Never commit `.env.local`, a service-account JSON key, private invitation exports, or a populated guest workbook. The repository ignores these local files.

## Sheet structure

The exact current `Lista` header order is included in the template and in `GUEST_SHEET_HEADERS` in `src/lib/sheets/guest-sheet.ts`. The fields fall into these groups:

- Identity: primary and second guest names, email, display name, source, and inviter flags.
- Invitation access: `guest_id`, `token`, `token_active`, `invite_url`, sent/opened timestamps.
- RSVP: dinner, party attendance per person, transfer, decline, note, and updated timestamp.
- Delivery: last status, provider message id, and last error.
- Door and seating: per-person check-in, table, seat position, and transfer time.
- Administration: counted flag, planning fields, and internal notes.

`Seating Tables` contains `table_id` and `table_name`. `Activity` contains `id`, `type`, `created_at`, `actor`, and `message` and is written by the application.

## Routes

- `/` redirects to `/host/login`.
- `/host/login` opens the host dashboard.
- `/host/seating` opens the seating planner.
- `/check-in` opens the phone-friendly check-in workflow.
- `/i/<token>` opens one private guest invitation.

## Customize before using it

At minimum, replace:

- Event names, dates, itinerary, seed guests, and host identity in `src/lib/seed-data.ts`.
- Invitation copy and visuals in `src/components/invitation/` and `public/assets/`.
- The seating source and table assumptions in `src/lib/seating.ts`.
- Email content in `src/lib/providers/email-template.ts`.
- Domain, secrets, Sheet ID, and email provider settings in the deployment environment.

The scripts in `local_automation_send/` were one-off browser automations for this event. Review every filter, target, message, credential path, and dry-run setting before considering them for another event. They are not part of the web application deployment.

## Checks

```bash
npm run lint
npm test
npx tsc --noEmit
npm run build
```

Run `npm run test:e2e` when the local browser test environment is available.

## Deployment

1. Create a Google Cloud service account and enable the Google Sheets API.
2. Share the copied RSVP spreadsheet with the service account as an editor.
3. Import this repository into Vercel.
4. Add the production environment variables.
5. Deploy and set `APP_URL` to the final domain.
6. Verify `/host/login`, `/host`, `/host/seating`, `/check-in`, and one disposable test invitation before sending links.

## Reuse

The source code is available under the MIT License. Original photographs and event artwork under `public/assets/collazzi/` and `local_automation_send/Invito.jpg` are excluded from that license and should be replaced for another event.
