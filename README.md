# Collazzi Invitation

Single-event invitation site inspired by the supplied Paperless Post screenshots and PDF.

## Stack

- Next.js 15 App Router
- TypeScript + Tailwind CSS
- Drizzle schema for Supabase/Postgres
- Optional Google Sheets guest and RSVP store
- Resend email delivery with sandbox fallback
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
columns. Guest phone numbers are intentionally not part of guest management or delivery; delivery is
email-only from the host dashboard. Accommodation phone numbers are still accommodation content.

Recommended guest column order keeps host-editable fields on the left:

1. `last_name` - guest surname. Required by the host dashboard one-person add form.
2. `first_name` - guest given name. Required by the host dashboard one-person add form.
3. `email` - optional email recipient for invitation and reminder delivery.
4. `invited_by_ale` - boolean host/source flag; surfaced as metadata in dashboard data.
5. `invited_by_bona` - boolean host/source flag; surfaced as metadata in dashboard data.
6. `invited_by_mum` - boolean host/source flag; surfaced as metadata in dashboard data.
7. `counted` - invitation gate. `TRUE`, `1`, or blank means the row is an invited guest in the app;
   `FALSE`, `0`, or `No` means the row is excluded from guest lookup, host stats, and token creation.
8. `source` - free-text provenance, for example `AleAI`, `Bona list`, `Mum table`, or
   `Instagram DM`.
9. `will_invite_to_walking_dinner` - boolean; controls whether the guest sees the Thursday dinner
   section and walking dinner RSVP question.
10. `sent_whatsapp_save_the_date` - boolean tracking marker only; it does not send WhatsApp messages.
11. `sent_instagram_save_the_date` - boolean tracking marker only; it does not send Instagram
    messages.
12. `spazio` - optional planning/admin field retained from the source sheet.
13. `guest_id` - app-generated stable row identifier used as the party/guest id.
14. `token` - app-generated private invitation token.
15. `token_active` - boolean; `FALSE` disables the private invitation link.
16. `invite_url` - app-generated URL from `APP_URL` and `token`.
17. `sent_invite_at` - timestamp written when the app sends the email invitation. A boolean `TRUE`
    is also treated as a sent marker, but timestamps are preferred.
18. `invite_opened_at` - timestamp written when the guest first opens the invitation link.
19. `coming_to_walking_dinner` - RSVP boolean for Thursday dinner.
20. `coming_to_party` - RSVP boolean for Friday party.
21. `transfer_needed` - RSVP boolean for shuttle/transfer need.
22. `not_coming` - RSVP boolean for a decline.
23. `rsvp_note` - free-text note submitted by the guest.
24. `rsvp_updated_at` - timestamp written when the RSVP is submitted.
25. `last_delivery_status` - last email delivery status: `sandbox`, `queued`, `sent`,
    `delivered`, `opened`, or `failed`.
26. `provider_message_id` - provider id used to match delivery webhook updates.
27. `last_error` - last delivery or RSVP-related error message; cleared on successful RSVP writes.
28. `admin_notes` - internal host notes shown in dashboard data, not guest-facing.

Boolean columns are values, not labels. The API reads and writes `TRUE`/`FALSE`; Google Sheets
checkbox formatting is recommended because it is easier for humans to edit the same boolean values.

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
   - Optional delivery variables: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
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
