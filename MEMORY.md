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

## 2026-06-22, RSVP Message Send Confirmation
**What was decided:** Pause before sending the `RSVP {invite_url}!` message batch because the requested source `Inviti 19esimi` is not present in the live sheet, the send channel was not specified, and one selected contact name has two different private links.
**Why:** Sending the wrong private RSVP link or using the wrong channel would be an external action that is hard to undo.
**What was rejected:** Immediately batch-sending to all 196 read-only-selected rows was rejected until the source spelling, channel rule, and duplicate handling are confirmed.

## 2026-06-22, Oliver Older Duplicate Row
**What was decided:** Keep Oliver Older row 367 and delete row 383 before the RSVP WhatsApp reminder batch.
**Why:** Row 367 has an email address and its invite link has already been opened, while row 383 has no email and an unopened link.
**What was rejected:** Keeping the `Fresh guys` row 383 solely because the source label fits better was rejected because preserving the active/private link history is more important.

## 2026-06-22, RSVP WhatsApp Resume Filter
**What was decided:** Resume the WhatsApp RSVP message batch after Sebastian Buenfil, using `source` in the selected list, `coming_to_party = FALSE`, and `not_coming = FALSE`.
**Why:** The user explicitly corrected the filter and stated they quit at Sebastian Buenfil, so the next unsent contact is Santiago Cerchione.
**What was rejected:** Continuing with only `coming_to_party = FALSE` was rejected because declined guests with `not_coming = TRUE` should not receive the reminder.

## 2026-06-22, RSVP WhatsApp Second Source Batch
**What was decided:** For the next WhatsApp RSVP batch, use exact case-insensitive source matches for `18esimiAI`, `ale`, `Didi`, `DidiAI`, `Firenze`, `FirenzeAI`, `Modulo`, `ModuloAI`, and `Roma`, with both `coming_to_party = FALSE` and `not_coming = FALSE`.
**Why:** The user listed these source labels directly and corrected the RSVP filter to require both false values.
**What was rejected:** Expanding `ale` to `AleAI` was rejected because lowercase `ale` exists as its own live-sheet source; resending to Rodrigo Agag and Brando Aragau was rejected because they already received the same WhatsApp RSVP message in the earlier run.

## 2026-06-22, Rebbecca Lando Duplicate Row
**What was decided:** For the second WhatsApp RSVP batch, use Rebbecca Lando row 503 and skip row 438.
**Why:** Row 503 has an opened invitation link, which is stronger evidence of the active private link for the guest than row 438's unopened link.
**What was rejected:** Deleting either Rebbecca Lando row was rejected because the user only asked to record not-found contacts for this batch, not to clean duplicate rows.
## 2026-07-16, RSVP Deadline Is Informational
**What was decided:** Guests can submit or change an RSVP at any time; 30 July 2026 is displayed in the host dashboard and included in invitation emails as an informational deadline.
**Why:** The previous deadline has passed, and the user needs late RSVP changes to remain possible while updated communication still gives guests the current requested deadline.
**What was rejected:** Keeping the past-deadline lock in either the browser or either server store was rejected because either path would prevent a guest from changing an RSVP.

## 2026-07-27, Email Is Optional for RSVP and Transport
**What was decided:** Guests can confirm an RSVP and transport preferences without saving an email address.
**Why:** The user asked to remove the email-save requirement from transport confirmation.
**What was rejected:** Leaving either local-store or Google Sheets RSVP validation in place was rejected because it would still block confirmation for guests without an email.

## 2026-07-27, Persistent RSVP Confirmation and Update Action
**What was decided:** After a successful or previously saved RSVP, show a persistent confirmation with the attendance status and replace the initial attendance choices with one Update action; the modal submit action also says Update for an existing response.
**Why:** Guests need clear evidence that their RSVP was saved and a clear way to change it.
**What was rejected:** Keeping only the active styling on Will attend or Will not attend was rejected because guests could not tell whether the save completed.

## 2026-08-03, Host RSVP Analytics by Inviter and Source
**What was decided:** Add an All/Ale/Bona/Mum filter to the host dashboard with individual-guest totals for Party yes, Party no, Party pending, and Dinner yes, followed by the same counts grouped by source.
**Why:** Hosts need a filter-safe attendance view without manually reconciling hidden Google Sheet rows; counting guest selections includes second guests consistently.
**What was rejected:** Adding dinner no/pending totals or expandable name lists was rejected as beyond the requested compact dashboard summary.

## 2026-08-03, RSVP Deadline Remains Informational
**What was decided:** Remove the RSVP deadline lock from both invitation controls and RSVP persistence so every active invitation can be answered or updated indefinitely.
**Why:** A clean production deployment restored old deadline checks and closed Alberto Berlingheri's invitation even though the deadline is meant only as guidance.
**What was rejected:** Exempting only Alberto or extending the date was rejected because either option would allow the same failure to recur for other guests.

## 2026-08-03, Individual Attendance Overrides Party Decline
**What was decided:** Build each guest selection directly from `coming_to_party` and `guest_2_coming_to_party`; use `not_coming` only as a legacy party-level signal, not as a gate over individual attendance.
**Why:** Matteo Grassi's row has the primary guest declining and guest two attending, but a stale `not_coming` value hid the second guest's explicit Yes response.
**What was rejected:** Editing only Matteo's row was rejected because any other mixed-attendance row with a stale party flag would display incorrectly again.
