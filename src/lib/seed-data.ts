import { nanoid } from "nanoid";

import type { AppState } from "@/lib/types";

const now = new Date().toISOString();

export const SEED_HOST_EMAILS = [
  "alessandro@collazzi.host",
  "sister@collazzi.host",
];

export function createToken(prefix = "invite") {
  return `${prefix}_${nanoid(18)}`;
}

export function createSeedState(): AppState {
  const couplePartyId = "party_preview_couple";
  const soloPartyId = "party_preview_solo";
  const familyPartyId = "party_preview_family";

  return {
    event: {
      id: "event_collazzi",
      slug: "collazzi",
      title: "Collazzi Invitation",
      subtitle: "A Paper Suite For A Summer Weekend",
      heroMonogram: "18 20",
      heroImageSrc: "/assets/seed/cover-villa.jpg",
      heroBackdropSrc: "/assets/textures/kraft-paper.jpg",
      paperTextureSrc: "/assets/textures/card-paper.jpg",
      summaryName: "Bona Alessandro Maniscalco",
      summaryDateLabel: "Friday, March 27, 7:30PM – Saturday, March 28, 7:30PM CET",
      summaryAddressName: "Villa I Collazzi",
      summaryAddressLabel: "Via Volterrana, 4A, 50018 Scandicci FI",
      introduction:
        "A two-evening invitation suite inspired directly by the uploaded Collazzi paperless post flow, recreated as a private digital invitation.",
      dressCode: "Black Tie & Long Dress",
      rsvpDeadline: "2026-09-01T23:59:59.000Z",
      footerNote:
        "Hosted privately for a single event. Every invitation link is unique to the guest group that receives it.",
    },
    hosts: [
      {
        id: "host_alessandro",
        name: "Alessandro",
        email: SEED_HOST_EMAILS[0],
        role: "owner",
      },
      {
        id: "host_sister",
        name: "Sister",
        email: SEED_HOST_EMAILS[1],
        role: "editor",
      },
    ],
    questions: [
      {
        id: "question_walking_dinner",
        label: "Walking Dinner – Thursday March 27th",
        type: "checkbox",
      },
      {
        id: "question_party",
        label: "The Party – Friday March 28th",
        type: "checkbox",
      },
      {
        id: "question_transfer",
        label: "Transfer needed for the party",
        type: "checkbox",
      },
    ],
    itinerary: [
      {
        id: "itinerary_dinner",
        dayLabel: "Thursday 27th",
        venueName: "Ristorante Frescobaldi Firenze",
        address: "31 Piazza della Signoria, Firenze",
        mapUrl:
          "https://www.google.com/maps/search/?api=1&query=Ristorante+Frescobaldi+Firenze",
        title: "Walking Dinner",
        datetimeLabel: "Thursday the 27th at 19h30",
        dressCode: "Dress code – Casual Chic",
        description:
          "A warm-up dinner in central Florence, styled after the first details page in the PDF.",
        imageSrc: "/assets/seed/restaurant-dinner.jpg",
      },
      {
        id: "itinerary_party",
        dayLabel: "Friday 28th",
        venueName: "Villa I Collazzi",
        address: "4A Via Volterrana, Impruneta",
        mapUrl:
          "https://www.google.com/maps/search/?api=1&query=Villa+I+Collazzi+Impruneta",
        title: "The Party",
        datetimeLabel: "Friday the 28th at 19h30",
        dressCode: "Dress code – Black Tie and Long Dress",
        description:
          "Shuttle departure from Piazza Torquato Tasso between 19h and 20h. Return options at 2h30, 3h30, 4h15 and 5h.",
        imageSrc: "/assets/seed/villa-party.jpg",
      },
    ],
    accommodations: [
      {
        id: "accommodation_horto",
        title: "Hotel Horto Convento",
        city: "Firenze",
        address: "13 Via dell'Orto, Firenze, Toscana 50124",
        phone: "+39 055 223529",
        ctaLabel: "Hortoconvento",
        ctaUrl: "https://hortoconvento.com/",
        imageSrc: "/assets/seed/accommodation-horto.jpg",
        notes:
          "Seeded from the accommodation slide visible in the uploaded PDF. Add or replace cards from the host dashboard.",
      },
    ],
    parties: [
      {
        id: couplePartyId,
        label: "Taylor & Jordan Russo",
        guestIds: ["guest_taylor", "guest_jordan"],
        email: "preview-couple@example.com",
        phone: "+15550001000",
        tags: ["friends", "vip"],
        notes: "Preview couple invite.",
        token: {
          value: "preview-couple",
          active: true,
        },
        deliveryIds: [],
      },
      {
        id: soloPartyId,
        label: "Ava Patel",
        guestIds: ["guest_ava"],
        email: "preview-solo@example.com",
        tags: ["friends"],
        notes: "Preview solo invite.",
        token: {
          value: "preview-solo",
          active: true,
        },
        deliveryIds: [],
      },
      {
        id: familyPartyId,
        label: "Morgan Family",
        guestIds: ["guest_morgan", "guest_emerson", "guest_luca"],
        email: "preview-family@example.com",
        phone: "+15550002000",
        tags: ["family"],
        notes: "Preview family invite.",
        token: {
          value: "preview-family",
          active: true,
        },
        deliveryIds: [],
      },
    ],
    guests: [
      { id: "guest_taylor", partyId: couplePartyId, name: "Taylor Russo" },
      { id: "guest_jordan", partyId: couplePartyId, name: "Jordan Russo" },
      { id: "guest_ava", partyId: soloPartyId, name: "Ava Patel" },
      { id: "guest_morgan", partyId: familyPartyId, name: "Morgan Bell" },
      { id: "guest_emerson", partyId: familyPartyId, name: "Emerson Bell" },
      { id: "guest_luca", partyId: familyPartyId, name: "Luca Bell" },
    ],
    deliveries: [],
    activities: [
      {
        id: "activity_seeded",
        type: "content_updated",
        createdAt: now,
        actor: "system",
        message: "Loaded seeded Collazzi invitation content from the uploaded PDF reference.",
      },
    ],
  };
}
