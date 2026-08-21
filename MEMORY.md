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

## 2026-08-20, Live Diana Seating Planner
**What was decided:** Add a protected `/host/seating` page backed by immediate Google Sheets writes for exactly the `Diana` source, with 15 tables of 10 numbered seats, a persistent alphabetical unseated list, drag/drop and click-based move/switch/drop controls, editable table labels stored in a `Seating Tables` tab, and gray-to-green check-in status. In the overview, use as much of each first name as fits and keep it on the same line as the seat number; in the expanded view, show a true circular tabletop with full first and last names arranged around its circumference. Number seats clockwise with 1–5 descending the left side and 6–10 ascending the right side, and omit check-in wording from unseated guest cards while retaining their status color.
**Why:** The seating arrangement needs to be quickly reorganized from either the full 15-table view or one enlarged table while remaining synchronized with the existing guest and check-in columns.
**What was rejected:** Draft-only saving was rejected because the user chose live persistence; storing editable table labels inside guest assignment cells was rejected because empty tables also need durable names; initials-only overview labels were rejected in favor of the longest readable first-name text.

## 2026-08-20, Individual Phone Check-In Workflow
**What was decided:** Add a separate PIN-protected `/check-in` workflow backed by the existing per-person check-in and table columns in the `Lista` Google Sheet. Search is name-order, accent, punctuation, and case insensitive; each named guest is checked independently; all phones refresh within 10 seconds; locations and RSVP eligibility are not stored or filtered.
**Why:** Door staff need a fast phone interface while Google Sheets remains the live source of truth and multiple staff may safely set the same intended check-in state concurrently.
**What was rejected:** Whole-invitation check-in, location-specific statuses, RSVP filtering, unnamed Guest 2 check-in, and adding host edit/delete controls in this change were rejected as inaccurate or outside the requested scope.
## 2026-08-05, Guided Walk Zoom and Host Open Link
**What was decided:** Number the Duomo cluster as Cupola del Brunelleschi 6, Campanile di Giotto 7, Duomo di Firenze 8, and Battistero di San Giovanni 9; support map zoom with Command or Control plus scroll; and restore a non-prefetched Open link action beside Copy link in each host guest card.
**Why:** The user supplied the exact corrected map numbering, requested modifier-assisted zoom that preserves ordinary page scrolling, and explicitly asked to restore the host opener.
**What was rejected:** Keeping the previous 6-7-8 Duomo ordering, enabling unrestricted wheel zoom, and retaining the 2026-05-06 removal of Open link were rejected because they conflict with the current request.

## 2026-08-05, Florence Maps and Guided Walk
**What was decided:** Split the Florence guide into a recommendation map that switches between Museums and Food and a second numbered guided-walk map. The walk runs Santo Spirito, Palazzo Pitti, Ponte Vecchio, Palazzo Vecchio, Santa Croce, the four Duomo-complex stops, and Santa Maria Novella; Boboli was replaced by Museo del Bargello in the museum recommendations.
**Why:** Separate maps keep the recommendations readable while making the requested walking order explicit, connected, and usable with photo previews and Google Maps links.
**What was rejected:** Keeping every museum, restaurant, and walking stop on one map was rejected because the pin density obscured the route; keeping Boboli was rejected because the user explicitly requested Bargello instead.

## 2026-08-05, Multi-Select Florence Map Layers
**What was decided:** Supersede the two-map layout with one shared map controlled by three independent Museums, Food, and Guided city walk buttons. Food is selected initially, at least one layer stays active, and selecting the walk shows a clickable 1–10 route list. Tour pins now use only geographic coordinates, including individual Duomo-complex entrances, without fixed pixel offsets.
**Why:** Guests can combine any recommendations on one map, while true geographic anchors keep route markers attached during zooming and the route list preserves an unambiguous order at city-wide zoom.
**What was rejected:** Keeping separate maps was rejected by the user; fixed screen-space marker offsets were rejected because they appeared to move relative to the map when zooming.
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

## 2026-08-03, Bilingual Group Gift Accordion
**What was decided:** Add a prominent closed-by-default Group gift accordion at the bottom of each invitation, with the supplied childhood photo and English/Italian letters side by side on desktop and stacked on mobile.
**Why:** Gift information and bank details need to be clearly discoverable without overwhelming the main invitation itinerary.
**What was rejected:** A modal was rejected because the content is long and easier to read, scroll, and revisit inline.

## 2026-08-04, Interactive Florence Guide
**What was decided:** Add a full-width, closed-by-default Florence guide above the group gift section, using one Leaflet/OpenStreetMap view with every museum and food location, category-specific pins, hover details, and Google Maps links.
**Why:** Guests can understand where all recommendations are relative to one another and open any specific destination for navigation.
**What was rejected:** The initial one-place-at-a-time Google Maps embed was superseded because it could not show all recommendations or custom category pins together; a static list was rejected because it would not provide the requested interactive map.

## 2026-08-07, Florence Museum Additions
**What was decided:** Add Cappella Brancacci and Palazzo Pitti to the Museums map layer with their official entrance locations and Google Maps searches.
**Why:** The user requested both places as additional museum recommendations.
**What was rejected:** Using the supplied spelling “Pallazzo Pitti” was rejected in favor of the official “Palazzo Pitti.”

## 2026-08-20, Shuttle Departure Window
**What was decided:** Show party shuttle departures from Piazza Torquato Tasso as running from 19:00 to 19:30.
**Why:** The user corrected the guest-facing departure window.
**What was rejected:** Keeping the previous 19h to 20h window was rejected because it is no longer accurate.

## 2026-08-20, Mum RSVP Source Breakdown
**What was decided:** When Mum is selected in the host RSVP Breakdown, display only the Diana source row while retaining totals for all of Mum’s invitees.
**Why:** The user asked for Mum’s source breakdown to be limited to Diana without changing the overall RSVP counts.
**What was rejected:** Filtering Mum’s total counts down to Diana was rejected because the request is specifically about the source display.

## 2026-08-20, Remove RSVP Deadline Messaging
**What was decided:** Remove RSVP-deadline messages from the host dashboard and invitation emails; guests can submit or update RSVPs indefinitely.
**Why:** The stated deadline has passed and the user explicitly wants ongoing RSVP changes.
**What was rejected:** Keeping the deadline as informational copy was rejected because it would still imply that RSVP changes close.

## 2026-08-20, Canonical Production Deployment
**What was decided:** Deploy production only from one verified canonical branch/build, then smoke-test `/host/login`, `/host`, and an invitation link before assigning `bonaalessandro.ink`.
**Why:** A later deployment from another checkout replaced the complete site and removed the host RSVP dashboard.
**What was rejected:** Direct production deployments from independent feature worktrees were rejected because Vercel replaces rather than combines their snapshots.

## 2026-08-20, Seating Search and Attendance Filter
**What was decided:** Add a guest-name search at the top-left of the seating workspace and include only individually attending guests whose source is Diana. Guest 1 uses `coming_to_party`; Guest 2 uses `guest_2_coming_to_party`.
**Why:** The seating plan should contain only expected party attendees, while mixed-response invitations must still include the person who is individually coming.
**What was rejected:** Filtering only the right-hand list was rejected because non-attendees could remain visible at tables; using the party-level `not_coming` value was rejected because it can hide an attending second guest.

## 2026-08-20, Canonical Main Deployment and Sheets Read Protection
**What was decided:** Make `main` the single complete production history and reduce Google Sheets quota pressure by validating host cookies without guest reads, pausing polling in hidden tabs, caching table labels, and falling back to the last successful guest read during a temporary 429.
**Why:** The live host page returned a Sheets read-quota error after seating and check-in polling multiplied guest reads, which made the entire RSVP dashboard appear missing even though the component was deployed.
**What was rejected:** Continuing production releases from feature branches was rejected because they can replace complete snapshots; slowing the visible 10-second refresh was rejected because door staff still need the agreed update cadence.

## 2026-08-20, Compact Table Header Click Area
**What was decided:** Limit the compact table-name edit target to the centered visible text so the empty header space on either side opens the table like the rest of the card.
**Why:** A full-width invisible name button intercepted clicks across the top line even where no text was visible.
**What was rejected:** Delaying every table click to distinguish single-click from double-click was rejected because it would make opening tables feel slower.

## 2026-08-20, Seating List Last-Name Order
**What was decided:** Sort the unseated seating list by last name, using first name as the tie-breaker and as the fallback when a surname is blank.
**Why:** The user wants the alphabetical source list organized by family name.
**What was rejected:** Keeping first-name order was rejected because it makes surname lookup slower.

## 2026-08-21, Three-Column Seating Overview
**What was decided:** Display the 15 compact seating tables in a fixed three-column overview grid.
**Why:** The user requested three table columns instead of five for larger, easier-to-read table cards.
**What was rejected:** Keeping the five-column desktop grid was rejected because each table was too narrow for the desired overview.

## 2026-08-21, Full Names in Seating Overview
**What was decided:** Show first name followed by last name in every occupied overview seat, keeping the text on one line and truncating only when the available seat width is exhausted.
**Why:** The wider three-column tables provide room to expose surnames and make guests easier to distinguish.
**What was rejected:** Continuing to show only first names in the overview was rejected because it wastes the newly available width.
