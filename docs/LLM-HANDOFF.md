# LLM handoff: adapting this project

This is a working one-event application, not a generic event platform. Preserve the existing behavior first, then replace event-specific content in small verified steps.

## Success criteria for a copy

The copied project is ready when:

1. it builds without the original private environment;
2. a sanitized test guest loads from the new Google Sheet;
3. the test invitation can submit and update an RSVP;
4. the host dashboard shows the update;
5. check-in updates the same named person;
6. seating changes save and survive a reload; and
7. all private links, email addresses, assets, domains, and credentials belong to the new event.

## Runtime map

- `src/lib/repository.ts` chooses the active persistence path.
- `src/lib/sheets/google-store.ts` reads and writes Google Sheets.
- `src/lib/sheets/guest-sheet.ts` defines and normalizes the guest columns.
- `src/lib/seating.ts` defines the 15-table, 10-seat, source-filtered seating rules.
- `src/lib/check-in.ts` builds the individual check-in list.
- `src/lib/seed-data.ts` contains event copy, host identity, itinerary, and local preview data.
- `src/components/invitation/` contains the guest experience.
- `src/components/host/` contains the dashboard and seating UI.
- `src/components/check-in/` contains the door workflow.
- `src/app/api/` contains the server endpoints.

## Google Sheets contract

Start with `docs/Collazzi-Sheets-Template.xlsx`, import it into Google Sheets, and preserve these tab names:

- `Lista`: one invitation party per row; headers are on row 3.
- `Seating Tables`: IDs 1-15 and editable labels.
- `Activity`: append-only operational history created by the app.

The application accepts several legacy header aliases, but a new copy should use the exact template headers. Do not put real guest data in Git.

The current wide row mixes several concepts because columns were added as the event evolved. It works. A future cleanup could use separate tables for:

- people;
- invitation parties and private tokens;
- RSVP answers;
- delivery attempts/events;
- check-in events;
- tables and seat assignments.

Do not perform that redesign while merely copying the project: it changes nearly every read/write path and needs migration tests.

## Recommended adaptation order

1. Run the test suite and production build unchanged.
2. Copy the Sheets template and connect a new service account.
3. Replace seed event data and host identity.
4. Replace the invitation artwork and event copy.
5. Generalize or change the seating constants only if the new event needs different tables, seats, or source filtering.
6. Configure Resend with a verified sender domain.
7. Add one disposable test invitation and verify the full RSVP/check-in/seating loop.
8. Only then import real guests.

## Important behavior to preserve

- A private invitation link is controlled by `token` and `token_active`.
- Primary and second guest attendance are separate fields on the same row.
- Sheet writes are live; seating and check-in are not draft-only.
- The seating planner currently includes individually attending guests from the exact source `Diana`.
- Table names are stored separately so empty tables can still be renamed.
- Incomplete Google Sheets configuration falls back to local mock data, so verify the copied host dashboard is reading the intended new Sheet before importing real guests.

## Privacy and safety

- Never commit populated guest lists, RSVP exports, `.env.local`, Google service-account keys, Resend keys, tokens, or browser profiles.
- Treat every `/i/<token>` URL as private guest data.
- Replace original event photography and artwork before publishing a copied event.
- Review `local_automation_send/` manually. Those scripts can contact real people and contain event-specific filters and messages.

## Useful prompt for another LLM

> Adapt this repository for a new event. First read README.md, docs/LLM-HANDOFF.md, MEMORY.md, src/lib/sheets/guest-sheet.ts, src/lib/sheets/google-store.ts, src/lib/repository.ts, and src/lib/seed-data.ts. Do not redesign the data model yet. Make the minimum event-specific changes, never commit credentials or guest data, and verify lint, tests, TypeScript, build, one RSVP, check-in, and seating persistence before deployment.
