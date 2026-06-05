## 2026-05-05, Guest Sheet Filter Interpretation
**What was decided:** For the international/non-Italian guest query, "Ale invited them" maps to `invited_by_ale = TRUE`, and "not invited in the dinner in Florence" maps to `will_invite_to_Florence_dinner = FALSE`.
**Why:** The sheet has separate planning and RSVP columns; `will_invite_to_Florence_dinner` is the invitation/planning flag, while `Florence_dinner` is the RSVP answer.
**What was rejected:** Using the `Florence_dinner` RSVP column as "not invited" was rejected because `FALSE` there can also mean no RSVP or not attending, not necessarily not invited.

## 2026-05-05, Host Invite Opens and Manual Channel Sends
**What was decided:** Host dashboard private invite links should disable Next.js prefetch, and WhatsApp/Instagram invite scripts should mark `sent_invite_at` after a successful send.
**Why:** Next.js production prefetch can render `/i/[token]`, whose render path records an invitation open; the manual channel scripts already had timestamp writes wired but disabled by the shared `MARK_SENT_INVITE_AT` flag.
**What was rejected:** Changing guest open tracking globally or removing the host open-link control was rejected as broader than needed for the observed false `opened` statuses.

## 2026-05-06, Host Add-Guest Display Name
**What was decided:** The host add-guest form should fill the display name field with the generated invitation label while name fields are edited, and manual edits to display name should stop further automatic changes.
**Why:** Hosts need to see the final label before adding a guest while still being able to override wording for an invited party.
**What was rejected:** Keeping display name blank until submit was rejected because the generated label was hidden; adding a separate preview-only label was rejected because the existing editable field can serve both roles.

## 2026-05-06, Host Open Link Removal
**What was decided:** Remove the per-guest "Open link" action from the host dashboard and keep "Copy link" as the host-safe invite-link action.
**Why:** The user explicitly requested removing "Open link" from the host page; this supersedes the 2026-05-05 decision that rejected removal as broader than needed for the earlier false-open-status fix.
**What was rejected:** Keeping "Open link" with prefetch disabled was rejected because the current request asks for the control to be removed entirely.

## 2026-05-06, Host Form Submission Rules
**What was decided:** Host login handles Enter explicitly in a small client form, while the host add-guest form blocks Enter and requires clicking "Add invited party".
**Why:** The prior login change only used `enterKeyHint`, which labels virtual keyboards but does not implement submit behavior; the user also requested click-only add-guest submission.
**What was rejected:** Relying on browser-native Enter behavior for both forms was rejected because it was unreliable on login and unwanted on add-guest.

## 2026-05-06, Host Dashboard Simplification
**What was decided:** Remove the black host dashboard header, including Home and Log out, and remove the secondary "Add invited party" heading under Add Guest.
**Why:** The user requested a simpler host page without that dashboard header or repeated add-guest title.
**What was rejected:** Keeping the header for session context was rejected because the user explicitly said it was not needed.

## 2026-05-06, Display Name Regeneration After Name Edits
**What was decided:** Any first-name or last-name change regenerates the add-guest display name and clears a prior manual override; matching last names generate "First e Second Last".
**Why:** The display name should keep reflecting current guest names after name corrections while still allowing manual edits until a name changes.
**What was rejected:** Preserving manual display-name overrides across name changes was rejected because it can leave stale invitation labels.

## 2026-05-12, Domain Outage Root Cause
**What was decided:** Treat the `bonaalessandro.ink` outage as a Namecheap registrar contact-verification/DNS delegation issue, not an app or Vercel deployment issue.
**Why:** Public DNS delegates the domain to Namecheap verification-hold nameservers that return `198.54.117.242`, while Namecheap's normal DNS servers already return Vercel's required `76.76.21.21`; forcing `bonaalessandro.ink` to Vercel's IP returns `HTTP/2 200` for `/host/login`.
**What was rejected:** Redeploying or changing application code was rejected because the latest Vercel production deployment is ready and the local production build passes.

## 2026-05-13, Host RSVP and Open Display
**What was decided:** Host guest cards should show explicit RSVP receipt and invitation-open badges from `party.response.updatedAt` and `party.token.openedAt`, independently from latest email delivery status.
**Why:** The live Maniscalco row had both `invite_opened_at` and `rsvp_updated_at`, but `last_delivery_status` was still `sent`; the old card only surfaced delivery status and an attendance summary, so the host view did not clearly say the guest opened or RSVPed.
**What was rejected:** Mutating the live Google Sheet to force `last_delivery_status=opened` was rejected because it would hide the real later email-send state and was not needed for display.

## 2026-06-02, Card Invite August Text
**What was decided:** Use image-generator-produced full-card edits for the regular and party-only card backs, then resize them back to the original `1240x1242` asset dimensions before replacing the served files.
**Why:** The generator added "August" cleanly inline on the date lines, while a text-only composite kept the original art but left visible ghosting around the old date text.
**What was rejected:** A local text-only overlay was rejected because it introduced artifacts; changing app code or references was rejected because replacing the existing served assets is the smallest change.

## 2026-06-02, Dress Code Translation Wording
**What was decided:** Display the party dress-code translation as "Black tie and long dress" while still recognizing old "e abito lungo" inputs for normalization.
**Why:** The user requested replacing the Italian mixed phrase with the English wording, and preserving old matches prevents stale content from leaking through browser-translation protection.
**What was rejected:** Only changing seed data was rejected because the protected translation component could still rewrite matching text back to the old phrase.

## 2026-06-05, Diana Column-T Invite Sends
**What was decided:** For the `Diana` source resend, use the literal live-sheet condition `source = Diana` and blank `sent_invite_at` in column T, then send email and write `sent_invite_at`, `last_delivery_status`, `provider_message_id`, and `last_error` directly.
**Why:** Several Diana rows had blank column T but nonblank/opened `last_delivery_status`, so the host UI's delivery-status filter would not match the user's "never sent" condition.
**What was rejected:** Using the normal host source-send filter was rejected because it keys off computed delivery status; normalizing or fixing unrelated sheet headers during this one-off send was rejected as outside the request.
