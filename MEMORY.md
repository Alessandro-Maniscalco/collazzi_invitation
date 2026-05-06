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
