import { describe, expect, it } from "vitest";

import { renderInvitationEmail } from "@/lib/providers/email-template";

const baseInput = {
  appUrl: "https://bonaalessandro.ink",
  inviteUrl: "https://bonaalessandro.ink/i/guest_example",
  partyLabel: "Alessandro Maniscalco",
  eventTitle: "Bona and Alessandro Maniscalco",
  summaryDateLabel: "Thursday, August 27th, 19h30 – Friday, August 28th, 19h30",
  summaryAddressName: "Villa I Collazzi",
  summaryAddressLabel: "Via Volterrana, 4A, 50018 Scandicci FI",
  rsvpDeadline: "2026-07-15T18:00:00.000Z",
  heroImageSrc: "/assets/collazzi/invito-save-date.jpg",
};

describe("renderInvitationEmail", () => {
  it("renders a plain invite email with the private link", () => {
    const email = renderInvitationEmail({
      ...baseInput,
      kind: "invite",
    });

    expect(email.subjectLine).toBe("Bona and Alessandro - invitation for Alessandro Maniscalco");
    expect(email.bodyPreview).toContain("Here is the invitation link for Alessandro Maniscalco");
    expect(email.text).toContain("Hi Alessandro,");
    expect(email.text).toContain(
      "Here is your invitation link: https://bonaalessandro.ink/i/guest_example!",
    );
    expect(email.text).toContain("Friday, August 28th, 2026, 19:30. Villa I Collazzi, Florence.");
    expect(email.text).not.toContain("Thursday, August 27th");
    expect(email.text).not.toContain("Here is your invitation link:\n");
    expect(email.text).toContain("Please RSVP by July 15th.");
    expect(email.text).toContain("Best,\nBona and Alessandro");
    expect(email.html).toContain("Hi Alessandro,");
    expect(email.html).toContain("text-align:left");
    expect(email.html).toContain("Here is your invitation link: <a");
    expect(email.html).toContain("https://bonaalessandro.ink/i/guest_example</a>!");
    expect(email.html).toContain("Friday, August 28th, 2026, 19:30. Villa I Collazzi, Florence.");
    expect(email.html).toContain("Please RSVP by July 15th.");
    expect(email.html).not.toContain("<img");
    expect(email.html).not.toContain("align=\"center\"");
    expect(email.html).not.toContain("OPEN INVITE");
    expect(email.html).not.toContain("api/invite-card");
    expect(email.html).not.toContain("background:#660033");
    expect(email.html).not.toContain("background=\"");
    expect(email.html).not.toContain("maniscalco-post-envelope-bg.jpg");
    expect(email.html).not.toContain("calendar.google.com");
    expect(email.html).not.toContain("google.com/maps");
    expect(email.text).not.toContain("google.com/maps");
  });

  it("uses reminder wording for reminder sends", () => {
    const email = renderInvitationEmail({
      ...baseInput,
      kind: "reminder",
    });

    expect(email.subjectLine).toBe(
      "Reminder: Bona and Alessandro - invitation for Alessandro Maniscalco",
    );
    expect(email.bodyPreview).toContain("Reminder to RSVP");
    expect(email.text).toContain(
      "Here is your invitation link: https://bonaalessandro.ink/i/guest_example!",
    );
  });

  it("uses first names for shared-surname couple greetings", () => {
    const email = renderInvitationEmail({
      ...baseInput,
      partyLabel: "Diana e Luigi Maniscalco",
      kind: "invite",
    });

    expect(email.text).toContain("Hi Diana e Luigi,");
    expect(email.html).toContain("Hi Diana e Luigi,");
    expect(email.text).not.toContain("Hi Diana e Luigi Maniscalco,");
  });

});
