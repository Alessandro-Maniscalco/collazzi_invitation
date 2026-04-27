import { nanoid } from "nanoid";

import type { AppState } from "@/lib/types";

const now = new Date().toISOString();

export const SEED_HOST_EMAILS = [
  "bona18ale20@gmail.com",
];

export const SEED_HOSTS = [
  {
    id: "host_bona_ale",
    name: "Bona e Alessandro",
    email: SEED_HOST_EMAILS[0],
    role: "owner",
  },
] satisfies AppState["hosts"];

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
      title: "Bona and Alessandro Maniscalco",
      subtitle: "",
      heroMonogram: "18 20",
      heroImageSrc: "/assets/collazzi/invitation-front.png",
      heroBackImageSrc: "/assets/collazzi/invitation-back.png",
      heroBackdropSrc: "/assets/textures/kraft-paper.jpg",
      paperTextureSrc: "/assets/textures/card-paper.jpg",
      summaryName: "Bona and Alessandro Maniscalco",
      summaryDateLabel: "Thursday, August 27th, 19h30 – Friday, August 28th, 19h30",
      summaryAddressName: "Villa I Collazzi",
      summaryAddressLabel: "Via Volterrana, 4A, 50018 Scandicci FI",
      introduction: "",
      dressCode: "Black Tie and Long Dress",
      rsvpDeadline: "2026-07-28T18:00:00.000Z",
      footerNote: "",
    },
    hosts: SEED_HOSTS.map((host) => ({ ...host })),
    questions: [
      {
        id: "question_walking_dinner",
        label: "Walking Dinner - Thursday, August 27th, 19h30",
        type: "checkbox",
      },
      {
        id: "question_party",
        label: "The Party - Friday, August 28th, 19h30",
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
        dayLabel: "Thursday, August 27th",
        venueName: "Ristorante Frescobaldi Firenze",
        address: "31 Piazza della Signoria Firenze",
        mapUrl:
          "https://www.google.com/maps/search/?api=1&query=Ristorante+Frescobaldi+Firenze",
        title: "Walking Dinner",
        datetimeLabel: "Thursday, August 27th, 19h30",
        dressCode: "Dress code - Casual Chic",
        description: "",
        imageSrc: "/assets/collazzi/thursday-restaurant.jpeg",
        note: "Walking Dinner\nThursday, August 27th, 19h30\nDress code - Casual Chic",
      },
      {
        id: "itinerary_party",
        dayLabel: "Friday, August 28th",
        venueName: "Villa I Collazzi",
        address: "4A Via Volterrana, Impruneta",
        mapUrl:
          "https://www.google.com/maps/search/?api=1&query=Villa+I+Collazzi+Impruneta",
        title: "The Party",
        datetimeLabel: "Friday, August 28th, 19h30",
        dressCode: "Dress code - Black Tie and Long Dress",
        description: "",
        imageSrc: "/assets/collazzi/friday-villa.jpeg",
        note: "The Party \nFriday, August 28th, 19h30\nDress code - Black Tie and Long Dress",
        subItems: [
          {
            id: "itinerary_party_shuttle",
            label: "Shuttle",
            venueName: "Piazza Torquato Tasso",
            address: "Firenze, Toscana 50124",
            mapUrl:
              "https://www.google.com/maps/search/?api=1&query=Piazza+Torquato+Tasso+Firenze",
            note: "Departure Times \nFrom 19h to 20h\n\nReturn to Florence Times \n2h30 - 3h30 - 4h15 - 5h",
          },
        ],
      },
    ],
    accommodations: [
      {
        id: "accommodation_horto",
        title: "Hotel Horto Convento Firenze",
        city: "Firenze",
        address: "13 Via dell'Orto\nFirenze, Toscana 50124",
        addressLines: ["13 Via dell'Orto", "Firenze, Toscana 50124"],
        phone: "+39 055 223529",
        ctaLabel: "hortoconvento",
        ctaUrl: "http://www.hortoconvento.com",
        imageSrc: "/assets/collazzi/horto-convento.jpeg",
        notes: "",
      },
      {
        id: "accommodation_una_vittoria",
        title: "UNA Hotels Vittoria Firenze",
        city: "Firenze",
        address: "59 Via Pisana\nFirenze, Toscana 50143",
        addressLines: ["59 Via Pisana", "Firenze, Toscana 50143"],
        phone: "+39 055 22771",
        ctaLabel: "unaitalianhospitality",
        ctaUrl:
          "https://www.unaitalianhospitality.com/it/soggiorni/una-hotels-vittoria-firenze",
        imageSrc: "/assets/collazzi/una-vittoria.jpeg",
        notes: "",
      },
      {
        id: "accommodation_portrait",
        title: "Portrait Firenze",
        city: "Firenze",
        address: "4 Lungarno degli Acciaiuoli\nFirenze, Toscana 50123",
        addressLines: ["4 Lungarno degli Acciaiuoli", "Firenze, Toscana 50123"],
        phone: "+39 055 396 8000",
        ctaLabel: "lungarnocollection",
        ctaUrl: "https://www.lungarnocollection.com/portrait-firenze/",
        imageSrc: "/assets/collazzi/portrait-firenze.jpeg",
        notes: "",
      },
      {
        id: "accommodation_ad_astra",
        title: "Ad Astra Books",
        city: "Firenze",
        address: "Via del Campuccio, 53, 50125 Firenze FI, Italia",
        addressLines: ["Via del Campuccio, 53, 50125 Firenze FI, Italia"],
        phone: "",
        ctaLabel: "adastraflorence.it",
        ctaUrl: "https://www.adastraflorence.it",
        imageSrc: "/assets/collazzi/ad-astra.jpeg",
        notes: "",
      },
      {
        id: "accommodation_lungarno",
        title: "Hotel Lungarno",
        city: "Firenze",
        address: "14 Borgo San Iacopo\nFirenze, Toscana 50125",
        addressLines: ["14 Borgo San Iacopo", "Firenze, Toscana 50125"],
        phone: "+39 055 3961",
        ctaLabel: "lungarnocollection",
        ctaUrl: "https://www.lungarnocollection.com/hotel-lungarno/",
        imageSrc: "/assets/collazzi/hotel-lungarno.jpeg",
        notes: "",
      },
    ],
    parties: [
      {
        id: couplePartyId,
        label: "Taylor & Jordan Russo",
        guestIds: ["guest_taylor", "guest_jordan"],
        email: "preview-couple@example.com",
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
