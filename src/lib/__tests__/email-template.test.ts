import { describe, expect, it } from "vitest";

import { renderInvitationEmail } from "@/lib/providers/email-template";

const baseInput = {
  appUrl: "https://project-9pfy4.vercel.app",
  inviteUrl: "https://project-9pfy4.vercel.app/i/guest_example",
  partyLabel: "Alessandro Maniscalco",
  eventTitle: "Bona Alessandro Maniscalco",
  summaryDateLabel: "Thursday, August 27, 7:30PM – Friday, August 28, 7:30PM CET",
  summaryAddressName: "Villa I Collazzi",
  summaryAddressLabel: "Via Volterrana, 4A, 50018 Scandicci FI",
  rsvpDeadline: "2026-06-15T18:00:00.000Z",
  heroImageSrc: "/assets/collazzi/invito-save-date.jpg",
};

describe("renderInvitationEmail", () => {
  it("renders a Paperless Post style invite email with the private card link", () => {
    const email = renderInvitationEmail({
      ...baseInput,
      kind: "invite",
    });

    expect(email.subjectLine).toBe("Bona Alessandro Maniscalco invitation");
    expect(email.bodyPreview).toContain("Open your private invitation");
    expect(email.text).toContain("For: Alessandro Maniscalco");
    expect(email.text).toContain("Friday, August 28");
    expect(email.text).toContain("Please RSVP before June 15th");
    expect(email.html).toContain("VIEW THE CARD");
    expect(email.html).toContain("For: Alessandro Maniscalco");
    expect(email.html).toContain("https://project-9pfy4.vercel.app/i/guest_example");
    expect(email.html).toContain(
      "https://project-9pfy4.vercel.app/assets/collazzi/invito-save-date.jpg",
    );
    expect(email.html).toContain("Villa I Collazzi");
  });

  it("uses reminder wording for reminder sends", () => {
    const email = renderInvitationEmail({
      ...baseInput,
      kind: "reminder",
    });

    expect(email.subjectLine).toBe("Reminder: Bona Alessandro Maniscalco");
    expect(email.bodyPreview).toContain("Reminder to RSVP");
    expect(email.text).toContain("Reminder to view the card and RSVP");
  });
});
