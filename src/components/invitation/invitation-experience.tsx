"use client";

/*
 * The envelope starts closed and centered on the tan paper background. Its top flap opens upward smoothly while the card stays tucked inside at a constant, slightly smaller-than-envelope size. The card then slides straight up without drifting sideways, while the envelope itself moves downward, so the card physically clears the pocket instead of looking like it passes through it. The back/top triangle of the envelope remains visible during this motion and does not disappear midway. Only after the full card has escaped the envelope does the card move in front, enlarge, and settle into the final viewing position. At the end, the card flips over with the same smooth turn as before, while the lower part of the envelope is cropped off-screen so the focus stays on the card.
 */

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
  type FormEvent,
} from "react";

import Image from "next/image";
import { Landmark, MapPin, Play, RefreshCw, UtensilsCrossed } from "lucide-react";

import { AccommodationCarousel } from "@/components/invitation/accommodation-carousel";
import { ProtectedTranslationText } from "@/components/invitation/protected-translation-text";
import { RsvpModal } from "@/components/invitation/rsvp-modal";
import { cn } from "@/lib/formatters";
import type {
  AttendanceStatus,
  InvitationView,
  ItineraryItem,
  ItinerarySubItem,
  PartyResponse,
} from "@/lib/types";

import styles from "./invitation-experience.module.css";

const OPENING_DURATION_MS = 3_800;
const CARD_FLIP_TRANSITION_MS = 2_460;

type SceneSide = "auto" | "front" | "back";
type SceneStyle = CSSProperties & Record<`--${string}`, string | number>;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function interval(progress: number, start: number, end: number) {
  return clamp((progress - start) / (end - start));
}

function mix(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function easeOutCubic(value: number) {
  const inverse = 1 - clamp(value);
  return 1 - inverse * inverse * inverse;
}

function easeInOutSine(value: number) {
  return -(Math.cos(Math.PI * clamp(value)) - 1) / 2;
}

function stageFromProgress(progress: number) {
  if (progress < 0.18) return 0;
  if (progress < 0.34) return 1;
  if (progress < 0.56) return 2;
  if (progress < 0.72) return 3;
  if (progress < 0.86) return 4;

  return 5;
}

function debugSceneFromLocation(): { progress: number; side: SceneSide } | null {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const rawProgress = params.get("progress");

  if (!rawProgress) return null;

  const progress = Number(rawProgress);

  if (!Number.isFinite(progress)) return null;

  const rawSide = params.get("side");
  const side: SceneSide =
    rawSide === "front" || rawSide === "back" || rawSide === "auto" ? rawSide : "front";

  return { progress: clamp(progress), side };
}

function buildSceneStyle(progress: number, side: SceneSide): SceneStyle {
  const boundedProgress = clamp(progress);
  const cardPeek = easeOutCubic(interval(boundedProgress, 0.04, 0.11));
  const flapOpen = easeInOutSine(interval(boundedProgress, 0.08, 0.22));
  const envelopeDrop = easeInOutSine(interval(boundedProgress, 0.56, 0.76));
  const cardSlide = easeInOutSine(interval(boundedProgress, 0.12, 0.58));
  const cardUncover = easeInOutSine(interval(boundedProgress, 0.16, 0.58));
  const cardRelease = easeInOutSine(interval(boundedProgress, 0.58, 0.66));
  const cardEnlarge = easeInOutSine(interval(boundedProgress, 0.66, 0.8));
  const cardFlip = easeInOutSine(interval(boundedProgress, 0.78, 0.95));
  const cardY = mix(mix(mix(42, 26, cardPeek), -7, cardSlide), -8, cardEnlarge);
  const cardScale = mix(0.64, 0.84, cardEnlarge);
  const cardX = 0;
  const cardOpacity = interval(boundedProgress, 0.04, 0.06);
  const envelopeX = 0;
  const envelopeY = mix(0, 84, envelopeDrop);
  const envelopeScale = 0.9;
  const backFlapOpacity = interval(boundedProgress, 0.08, 0.2);
  const mouthFlapOpen = easeInOutSine(interval(boundedProgress, 0.06, 0.2));
  const mouthFlapOpacity = 1 - interval(boundedProgress, 0.04, 0.16);
  const linerOpacity = interval(boundedProgress, 0.04, 0.14);
  const closedBackOpacity = 1 - interval(boundedProgress, 0.04, 0.12);
  const frontFlapOpacity = 0;
  const finalSideIsBack = side === "auto" ? true : side === "back";
  const cardRotate = boundedProgress < 1 ? mix(0, 180, cardFlip) : finalSideIsBack ? 180 : 0;

  return {
    "--card-y": `${cardY}%`,
    "--card-x": `${cardX}%`,
    "--card-scale": cardScale.toFixed(4),
    "--card-opacity": cardOpacity.toFixed(4),
    "--card-clip-bottom": `${mix(12, 0, cardUncover).toFixed(3)}%`,
    "--card-layer": cardRelease < 1 ? 3 : 6,
    "--card-rotate": `${cardRotate.toFixed(3)}deg`,
    "--card-shadow":
      boundedProgress < 0.65
        ? "3px 3px 8px rgba(0, 0, 0, 0.14)"
        : "3px 3px 12px rgba(0, 0, 0, 0.26)",
    "--card-rotate-transition":
      boundedProgress < 1 ? "none" : `transform ${CARD_FLIP_TRANSITION_MS}ms var(--flip-ease)`,
    "--envelope-opacity": "1",
    "--envelope-x": `${envelopeX}%`,
    "--envelope-y": `${envelopeY.toFixed(3)}%`,
    "--envelope-scale": envelopeScale.toFixed(4),
    "--envelope-crop": "0%",
    "--closed-back-opacity": closedBackOpacity.toFixed(4),
    "--front-flap-opacity": frontFlapOpacity.toFixed(4),
    "--front-flap-transform": `translate3d(0, ${mix(0, -23, flapOpen).toFixed(3)}%, 0.4px) rotateX(${mix(
      0,
      84,
      flapOpen,
    ).toFixed(3)}deg) scaleY(${mix(1, 0.28, flapOpen).toFixed(4)})`,
    "--mouth-flap-opacity": mouthFlapOpacity.toFixed(4),
    "--mouth-flap-transform": `translate3d(0, ${mix(0, -4, mouthFlapOpen).toFixed(
      3,
    )}%, 0.6px) scaleY(${mix(1, 0.55, mouthFlapOpen).toFixed(4)})`,
    "--back-flap-opacity": backFlapOpacity.toFixed(4),
    "--back-flap-transform": `translate3d(0, 0, -0.4px) rotateX(${mix(
      -84,
      0,
      flapOpen,
    ).toFixed(3)}deg)`,
    "--liner-opacity": linerOpacity.toFixed(4),
  };
}

function MultilineText({ text, className }: { text: string; className?: string }) {
  return (
    <p className={className}>
      {text.split("\n").map((line, index, lines) => (
        <Fragment key={`${line}-${index}`}>
          <ProtectedTranslationText text={line} />
          {index < lines.length - 1 ? <br /> : null}
        </Fragment>
      ))}
    </p>
  );
}

function LocationLink({
  venueName,
  address,
  mapUrl,
  compact = false,
  showRule = true,
}: {
  venueName: string;
  address: string;
  mapUrl: string;
  compact?: boolean;
  showRule?: boolean;
}) {
  return (
    <address className={styles.locationBlock}>
      {showRule ? <hr className={styles.locationRule} /> : null}
      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.locationLink}
      >
        <span className={cn(styles.locationVenue, compact && styles.locationVenueCompact)}>
          {venueName}
        </span>
        <span className={styles.locationAddress}>{address}</span>
      </a>
    </address>
  );
}

function EnvelopeLayer({ src }: { src: string }) {
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes="(min-width: 768px) 440px, 78vw"
      className={styles.envelopeImage}
      unoptimized
    />
  );
}

function EnvelopeBackFlap() {
  return <EnvelopeLayer src="/assets/collazzi/paperless-envelope-back-flap-open.png" />;
}

function EnvelopeBase() {
  return <EnvelopeLayer src="/assets/collazzi/paperless-envelope-back-base-square.png" />;
}

function EnvelopeLiner() {
  return null;
}

function EnvelopeCover() {
  return <EnvelopeLayer src="/assets/collazzi/paperless-envelope-back-cover-square.png" />;
}

function EnvelopeClosedFace() {
  return <EnvelopeLayer src="/assets/collazzi/paperless-envelope-front-base.png" />;
}

function EnvelopeFrontFlap() {
  return <EnvelopeLayer src="/assets/collazzi/paperless-envelope-front-flap.png" />;
}

function TravelSubItem({ item }: { item: ItinerarySubItem }) {
  return (
    <div className={styles.travelTextItem}>
      <hr className={styles.locationRule} />
      {item.label ? <h4 className={styles.itemLabel}>{item.label}</h4> : null}
      {item.note ? <MultilineText text={item.note} className={styles.itemNote} /> : null}
      {item.venueName && item.address && item.mapUrl ? (
        <LocationLink
          venueName={item.venueName}
          address={item.address}
          mapUrl={item.mapUrl}
          compact
          showRule={false}
        />
      ) : null}
      {item.hours ? <MultilineText text={item.hours} className={styles.itemNote} /> : null}
    </div>
  );
}

function TravelBlock({ item }: { item: ItineraryItem }) {
  const note =
    item.note ?? `${item.title}\n${item.datetimeLabel}\n${item.dressCode}`;

  return (
    <section data-block-type="templated_block" className={styles.block}>
      <div className={styles.blockContainer}>
        <div className={styles.blockInnerStack}>
          <header className={styles.blockHeader}>
            <h2 className={styles.blockTitle}>{item.dayLabel}</h2>
          </header>

          <div className={styles.travelItems}>
            <div className={styles.travelImageItem}>
              <figure className={styles.travelImageFrame}>
                <Image
                  src={item.imageSrc}
                  alt={item.venueName}
                  fill
                  className={styles.travelImage}
                  sizes="(min-width: 900px) 820px, calc(100vw - 64px)"
                />
              </figure>
              <LocationLink
                venueName={item.venueName}
                address={item.address}
                mapUrl={item.mapUrl}
              />
            </div>

            <div className={styles.travelTextItem}>
              <MultilineText text={note} className={styles.itemNote} />
            </div>

            {item.subItems?.map((subItem) => (
              <TravelSubItem key={subItem.id} item={subItem} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

type FlorenceSuggestion = {
  id: string;
  title: string;
  description?: string;
  query?: string;
};

const FLORENCE_MUSEUMS: FlorenceSuggestion[] = [
  {
    id: "uffizi",
    title: "Uffizi Gallery",
    description:
      "Botticelli’s Primavera and Birth of Venus, plus a thousand other Renaissance masterpieces",
  },
  {
    id: "accademia",
    title: "Accademia Gallery",
    description: "Michelangelo’s David",
  },
  {
    id: "opera-duomo",
    title: "Museo dell’Opera del Duomo",
    description: "The whole story of Brunelleschi’s Dome, the symbol of the city",
  },
  {
    id: "boboli",
    title: "Boboli Gardens",
    description: "The world’s first Italian-style garden",
  },
];

const FLORENCE_FOOD: FlorenceSuggestion[] = [
  {
    id: "quattro-leoni",
    title: "Trattoria 4 Leoni",
    description: "Informal classic Florentine food",
  },
  {
    id: "trattoria-carmine",
    title: "Trattoria del Carmine",
    description: "Informal classic Florentine food",
  },
  {
    id: "vini-vecchi-sapori",
    title: "Vini e Vecchi Sapori",
    description: "Informal classic Florentine food",
  },
  {
    id: "latini",
    title: "Il Latini",
    description: "Famous for their Florentine steak",
  },
  {
    id: "frescobaldi",
    title: "Ristorante Frescobaldi",
    description: "Nice food and wines!",
  },
  {
    id: "orazio",
    title: "da Orazio",
    description: "Street food — with the typical lampredotto sandwich",
    query: "Da Orazio Florence lampredotto",
  },
  {
    id: "antico-vinaio",
    title: "Antico Vinaio",
    description: "World-famous for their hot, stuffed schiacciata",
  },
  {
    id: "amble",
    title: "Amblé",
    description: "Bistro with gourmet sandwiches",
  },
  {
    id: "sprone",
    title: "Pizzeria Lo Sprone",
    description: "Wood-fired oven pizza",
  },
  {
    id: "vivoli",
    title: "Gelateria Vivoli",
    description: "Best ice cream in town — you will enjoy it at the party as well",
  },
  {
    id: "passera",
    title: "Gelateria della Passera",
    description: "Award-winning artisanal gelato",
  },
  {
    id: "venchi",
    title: "Venchi Icecream and Chocolate",
    query: "Venchi Firenze",
  },
];

const FLORENCE_SUGGESTIONS = [...FLORENCE_MUSEUMS, ...FLORENCE_FOOD];

function florenceMapQuery(suggestion: FlorenceSuggestion) {
  return suggestion.query ?? `${suggestion.title}, Florence, Italy`;
}

function FlorenceSuggestions() {
  const [selectedId, setSelectedId] = useState(FLORENCE_MUSEUMS[0].id);
  const selected =
    FLORENCE_SUGGESTIONS.find((suggestion) => suggestion.id === selectedId) ??
    FLORENCE_MUSEUMS[0];
  const selectedQuery = florenceMapQuery(selected);
  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(selectedQuery)}&output=embed`;
  const externalMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    selectedQuery,
  )}`;

  const renderSuggestion = (suggestion: FlorenceSuggestion) => {
    const isSelected = suggestion.id === selected.id;

    return (
      <button
        key={suggestion.id}
        type="button"
        className={cn(styles.florencePlace, isSelected && styles.florencePlaceActive)}
        aria-label={`Show ${suggestion.title} on map`}
        aria-pressed={isSelected}
        onClick={() => setSelectedId(suggestion.id)}
      >
        <span className={styles.florencePlaceMarker} aria-hidden="true">
          <MapPin size={16} strokeWidth={1.8} />
        </span>
        <span>
          <strong>{suggestion.title}</strong>
          {suggestion.description ? <small>{suggestion.description}</small> : null}
        </span>
      </button>
    );
  };

  return (
    <section data-block-type="florence_suggestions" className={styles.florenceBlock}>
      <div className={styles.florenceInner}>
        <details className={styles.florenceDetails} data-testid="florence-suggestions-details">
          <summary className={styles.florenceSummary}>
            <span className={styles.florenceSummaryIcon} aria-hidden="true">
              <MapPin size={24} strokeWidth={1.6} />
            </span>
            <span className={styles.florenceSummaryCopy}>
              <span className={styles.florenceEyebrow}>Our local guide</span>
              <span className={styles.florenceTitle}>Welcome to Florence!</span>
              <span className={styles.florenceSummaryNote}>Museums, food and local favourites</span>
            </span>
            <span className={styles.florenceToggle} aria-hidden="true" />
          </summary>

          <div className={styles.florenceContent}>
            <header className={styles.florenceIntro}>
              <p>
                Here are some tips to help you get an authentic and delicious taste of the
                city!
              </p>
              <p>
                You can stroll through the marvelous center of Florence or visit a museum.
                Here are some suggestions:
              </p>
            </header>

            <div className={styles.florenceGuide}>
              <div className={styles.florenceLists}>
                <section className={styles.florenceCategory} aria-labelledby="florence-see">
                  <h3 id="florence-see">
                    <Landmark size={19} strokeWidth={1.6} aria-hidden="true" />
                    What to see
                  </h3>
                  <div className={styles.florencePlaces}>
                    {FLORENCE_MUSEUMS.map(renderSuggestion)}
                  </div>
                </section>

                <section className={styles.florenceCategory} aria-labelledby="florence-eat">
                  <h3 id="florence-eat">
                    <UtensilsCrossed size={19} strokeWidth={1.6} aria-hidden="true" />
                    Where to eat like a local
                  </h3>
                  <div className={styles.florencePlaces}>{FLORENCE_FOOD.map(renderSuggestion)}</div>
                </section>
              </div>

              <aside className={styles.florenceMapPanel} aria-live="polite">
                <div className={styles.florenceMapHeading}>
                  <div>
                    <span>Showing on the map</span>
                    <strong>{selected.title}</strong>
                  </div>
                  <a href={externalMapUrl} target="_blank" rel="noopener noreferrer">
                    Open in Google Maps
                  </a>
                </div>
                <iframe
                  key={selected.id}
                  className={styles.florenceMap}
                  src={embedUrl}
                  title={`Map showing ${selected.title}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </aside>
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}

function GroupGift() {
  return (
    <section data-block-type="group_gift" className={styles.giftBlock}>
      <div className={styles.blockContainer}>
        <div className={styles.giftInner}>
          <details className={styles.giftDetails} data-testid="group-gift-details">
            <summary className={styles.giftSummary}>
              <span className={styles.giftTitle}>Group gift to Bona and Alessandro</span>
              <span className={styles.giftToggle} aria-hidden="true" />
            </summary>

            <div className={styles.giftContent}>
              <figure className={styles.giftPhotoFrame}>
                <Image
                  src="/assets/collazzi/group-gift-bona-alessandro.png"
                  alt="Bona and Alessandro together as children"
                  fill
                  sizes="(min-width: 760px) 360px, calc(100vw - 96px)"
                  className={styles.giftPhoto}
                />
              </figure>

              <div className={styles.giftLanguages}>
                <article className={styles.giftLetter} lang="en" translate="no">
                  <p>Dear Friends,</p>
                  <p>
                    We are so happy to celebrate our 18th and 20th birthdays with you! That
                    alone is already a wonderful gift.
                  </p>
                  <p>
                    Many of you, however, have asked us what we would like, so we have chosen
                    something to remember this celebration by.
                  </p>
                  <p>Bona has chosen a watch to take with her to Segovia!</p>
                  <p>
                    Alessandro, instead, has chosen a beautiful long coat to face the harsh
                    Pennsylvania winters!
                  </p>
                  <p>
                    Thank you so much. See you soon!
                    <br />
                    Bona and Alessandro
                  </p>

                  <div className={styles.giftBankDetails}>
                    <p>
                      Below are the bank details (IBAN) for the UniCredit current account held
                      by BONA MANISCALCO:
                    </p>
                    <p className={styles.giftIban}>IT41U0200805056000430966326</p>
                    <p>
                      Country: IT
                      <br />
                      CIN/EU: 41
                      <br />
                      CIN/IT: U
                      <br />
                      ABI: 02008
                      <br />
                      CAB: 05056
                      <br />
                      Account number: 000430966326
                      <br />
                      BIC/SWIFT: UNCRITM1C14
                      <br />
                      Payment reference: Gift for Bona and Alessandro
                    </p>
                  </div>
                </article>

                <article className={styles.giftLetter} lang="it" translate="no">
                  <p>Cari Amici,</p>
                  <p>
                    Siamo felicissimi di festeggiare con voi i nostri 18 e 20 anni! Ed è questo
                    già un bellissimo regalo.
                  </p>
                  <p>
                    In tanti però ci chiedete un nostro desiderio ed allora avremmo scelto un
                    oggetto per ricordare questo festeggiamento.
                  </p>
                  <p>Bona avrebbe scelto un orologio da portarsi a Segovia!</p>
                  <p>
                    Alessandro invece un bel cappotto lungo per affrontare i rigidi inverni
                    della Pennsylvania!
                  </p>
                  <p>
                    Grazie mille. See you soon !
                    <br />
                    Bona ed Alessandro
                  </p>

                  <div className={styles.giftBankDetails}>
                    <p>
                      Di seguito le coordinate bancarie (IBAN) del conto corrente presso
                      UniCredit intestato a BONA MANISCALCO:
                    </p>
                    <p className={styles.giftIban}>IT41U0200805056000430966326</p>
                    <p>
                      Paese: IT
                      <br />
                      CIN/EU: 41
                      <br />
                      CIN/IT: U
                      <br />
                      ABI: 02008
                      <br />
                      CAB: 05056
                      <br />
                      Numero C/C: 000430966326
                      <br />
                      BIC/SWIFT: UNCRITM1C14
                      <br />
                      Causale: Regalo Bona ed Alessandro
                    </p>
                  </div>
                </article>
              </div>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}

export function InvitationExperience({ invitation }: { invitation: InvitationView }) {
  const [progress, setProgress] = useState(0);
  const [sequenceKey, setSequenceKey] = useState(0);
  const [sceneSide, setSceneSide] = useState<SceneSide>("auto");
  const [modalOpen, setModalOpen] = useState(false);
  const [preferredStatus, setPreferredStatus] = useState<AttendanceStatus | undefined>(undefined);
  const [response, setResponse] = useState<PartyResponse | undefined>(invitation.party.response);
  const [savedGuestEmail, setSavedGuestEmail] = useState(invitation.party.email ?? "");
  const [guestEmail, setGuestEmail] = useState(invitation.party.email ?? "");
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isEmailPending, startEmailTransition] = useTransition();
  const hasGuestEmail = Boolean(savedGuestEmail.trim());
  const showEmailCapture = !hasGuestEmail || emailSaved;
  const party = { ...invitation.party, email: savedGuestEmail || undefined, response };
  const stage = stageFromProgress(progress);
  const sceneStyle = useMemo(() => buildSceneStyle(progress, sceneSide), [progress, sceneSide]);

  useEffect(() => {
    const debugScene = debugSceneFromLocation();

    if (debugScene) {
      setProgress(debugScene.progress);
      setSceneSide(debugScene.side);
      return;
    }

    let frame = 0;
    const startedAt = window.performance.now();

    setProgress(0);
    setSceneSide("auto");

    function tick(now: number) {
      const nextProgress = clamp((now - startedAt) / OPENING_DURATION_MS);

      setProgress(nextProgress);

      if (nextProgress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    }

    frame = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frame);
  }, [sequenceKey]);

  function openRsvp(status?: AttendanceStatus) {
    setPreferredStatus(status);
    setModalOpen(true);
  }

  function replayScene() {
    setSequenceKey((current) => current + 1);
  }

  function flipCard() {
    if (progress < 1) return;

    setSceneSide((current) => (current === "back" || current === "auto" ? "front" : "back"));
  }

  function saveEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError(null);

    startEmailTransition(async () => {
      const result = await fetch("/api/guest/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: party.token.value,
          email: guestEmail,
        }),
      });

      if (!result.ok) {
        const payload = (await result.json().catch(() => null)) as { error?: string } | null;
        setEmailError(payload?.error ?? "Unable to save email.");
        return;
      }

      const payload = (await result.json()) as { email: string };
      setGuestEmail(payload.email);
      setSavedGuestEmail(payload.email);
      setEmailSaved(true);
    });
  }

  return (
    <main className={styles.shell}>
      <section data-block-type="primary_media" className={styles.primaryMedia}>
        <div className={styles.mediaContainer}>
          <figure
            data-test="editor-media-modify-button"
            data-stage={stage}
            className={styles.mediaInner}
          >
            <div className={styles.controlRail}>
              <button
                type="button"
                onClick={flipCard}
                aria-label="Flip invitation card"
                className={styles.controlButton}
              >
                <RefreshCw size={20} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={replayScene}
                aria-label="Replay invitation preview"
                className={styles.controlButton}
              >
                <Play size={20} fill="currentColor" strokeWidth={1.8} />
              </button>
            </div>

            <div
              key={sequenceKey}
              className={styles.stack}
              style={sceneStyle}
            >
              <div className={styles.envelopeBack}>
                <div className={styles.envelopeBackFlap}>
                  <EnvelopeBackFlap />
                </div>
                <div className={styles.envelopeBase}>
                  <EnvelopeBase />
                </div>
                <div className={styles.envelopeLiner}>
                  <EnvelopeLiner />
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardRotator}>
                  <div className={cn(styles.cardFace, styles.cardFrontFace)}>
                    <Image
                      src={invitation.event.heroImageSrc}
                      alt={`${invitation.event.summaryName} invitation front`}
                      fill
                      priority
                      className={styles.cardImage}
                      sizes="(min-width: 768px) 560px, 82vw"
                    />
                  </div>
                  <div className={cn(styles.cardFace, styles.cardBackFace)}>
                    <Image
                      src={invitation.event.heroBackImageSrc}
                      alt={`${invitation.event.summaryName} invitation details`}
                      fill
                      className={cn(styles.cardImage, styles.cardBackImage)}
                      sizes="(min-width: 768px) 560px, 82vw"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.envelopeFront}>
                <div className={styles.envelopeCover}>
                  <EnvelopeCover />
                </div>
                <div className={styles.envelopeMouthFlap} />
                <div className={styles.envelopeClosedBack} />
                <div className={styles.envelopeClosedFace}>
                  <EnvelopeClosedFace />
                </div>
                <div className={styles.envelopeFrontFlap}>
                  <EnvelopeFrontFlap />
                </div>
              </div>
            </div>
          </figure>
        </div>
      </section>

      {showEmailCapture ? (
        <section data-block-type="email_capture" className={styles.emailCapture}>
          <div className={styles.emailCaptureInner}>
            {emailSaved ? (
              <div className={styles.emailSaved}>Email saved.</div>
            ) : (
              <form onSubmit={saveEmail} className={styles.emailForm}>
                <label className={styles.emailLabel} htmlFor="guest-email">
                  Please enter your email:
                </label>
                <div className={styles.emailControls}>
                  <input
                    id="guest-email"
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(event) => setGuestEmail(event.target.value)}
                    className={styles.emailInput}
                  />
                  <button
                    type="submit"
                    disabled={isEmailPending}
                    className={styles.emailButton}
                  >
                    {isEmailPending ? "Saving..." : "Save email"}
                  </button>
                </div>
                {emailError ? <div className={styles.emailError}>{emailError}</div> : null}
              </form>
            )}
          </div>
        </section>
      ) : null}

      <section data-block-type="basic_info" className={styles.block}>
        <div className={styles.blockContainer}>
          <div className={styles.basicInner}>
            <div className={styles.eventBlock}>
              <div className={styles.gridTitle}>
                <h1 data-test="event-title" className={styles.eventTitle}>
                  {invitation.event.summaryName}
                </h1>
                <p
                  id="recipient_name"
                  data-testid="recipient-to-name"
                  aria-label={`To: ${party.label}`}
                  className={styles.recipient}
                >
                  <span className={styles.recipientLabel}>To: </span>
                  <span className={styles.recipientName}>{party.label}</span>
                </p>
                {response ? (
                  <div
                    className={styles.rsvpConfirmation}
                    role="status"
                    aria-live="polite"
                  >
                    <p className={styles.rsvpConfirmationText}>
                      RSVP confirmed —{" "}
                      {response.status === "attending"
                        ? "You will attend."
                        : "You will not attend."}
                    </p>
                    <button
                      type="button"
                      data-test="rsvp-update-button"
                      onClick={() => openRsvp(response.status)}
                      className={styles.rsvpButton}
                    >
                      Update
                    </button>
                  </div>
                ) : (
                  <div className={styles.rsvpButtons}>
                    <button
                      type="button"
                      data-test="rsvp-button"
                      onClick={() => openRsvp("attending")}
                      className={styles.rsvpButton}
                    >
                      Will attend
                    </button>
                    <button
                      type="button"
                      data-test="rsvp-button"
                      onClick={() => openRsvp("not_attending")}
                      className={styles.rsvpButton}
                    >
                      Will not attend
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className={styles.blockHr} />

      {invitation.itinerary.map((item) => (
        <Fragment key={item.id}>
          <TravelBlock item={item} />
          <hr className={styles.blockHr} />
        </Fragment>
      ))}

      <AccommodationCarousel cards={invitation.accommodations} />

      <hr className={styles.blockHr} />
      <FlorenceSuggestions />
      <GroupGift />

      <RsvpModal
        open={modalOpen}
        partyLabel={party.label}
        guests={invitation.guests}
        questions={invitation.questions}
        token={party.token.value}
        initialResponse={response}
        preferredStatus={preferredStatus}
        onClose={() => setModalOpen(false)}
        onSubmitted={setResponse}
      />
    </main>
  );
}
