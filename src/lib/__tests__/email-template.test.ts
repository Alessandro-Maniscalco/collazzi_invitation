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
  rsvpDeadline: "2026-07-28T18:00:00.000Z",
  heroImageSrc: "/assets/collazzi/invito-save-date.jpg",
};

describe("renderInvitationEmail", () => {
  it("renders a Maniscalco Post style invite email with the private card link", () => {
    const email = renderInvitationEmail({
      ...baseInput,
      kind: "invite",
    });

    expect(email.subjectLine).toBe("Bona and Alessandro Maniscalco invitation");
    expect(email.bodyPreview).toContain("Open your private invitation");
    expect(email.text).toContain("For: Alessandro Maniscalco");
    expect(email.text).toContain("Friday, August 28th, 19h30");
    expect(email.text).not.toContain("Thursday, August 27th");
    expect(email.text).toContain("Please RSVP before July 28th");
    expect(email.html).toContain("VIEW THE CARD");
    expect(email.html).toContain("For: Alessandro Maniscalco");
    expect(email.html).toContain("https://bonaalessandro.ink/i/guest_example");
    expect(email.html).toContain(
      "https://bonaalessandro.ink/assets/collazzi/maniscalco-post-envelope-bg.jpg",
    );
    expect(email.html).toContain("background:#660033");
    expect(email.html).toContain("Villa I Collazzi");
    expect(email.html).toContain("Via Volterrana, 4A, 50018 Scandicci FI");
    expect(email.html).not.toContain("calendar.google.com");
    expect(email.html).not.toContain("google.com/maps");
    expect(email.text).not.toContain("google.com/maps");
  });

  it("uses reminder wording for reminder sends", () => {
    const email = renderInvitationEmail({
      ...baseInput,
      kind: "reminder",
    });

    expect(email.subjectLine).toBe("Reminder: Bona and Alessandro Maniscalco");
    expect(email.bodyPreview).toContain("Reminder to RSVP");
    expect(email.text).toContain("Reminder to view the card and RSVP");
  });
});
