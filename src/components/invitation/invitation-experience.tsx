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
import {
  Footprints,
  Landmark,
  MapPin,
  Play,
  RefreshCw,
  UtensilsCrossed,
} from "lucide-react";

import { AccommodationCarousel } from "@/components/invitation/accommodation-carousel";
import {
  FlorenceMap,
  type FlorenceMapSuggestion,
} from "@/components/invitation/florence-map";
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

const FLORENCE_MUSEUMS: FlorenceMapSuggestion[] = [
  {
    id: "uffizi",
    title: "Uffizi Gallery",
    description:
      "Botticelli’s Primavera and Birth of Venus, plus a thousand other Renaissance masterpieces",
    category: "museum",
    position: [43.7683129, 11.2558009],
  },
  {
    id: "accademia",
    title: "Accademia Gallery",
    description: "Michelangelo’s David",
    category: "museum",
    position: [43.7769174, 11.2587579],
  },
  {
    id: "opera-duomo",
    title: "Museo dell’Opera del Duomo",
    description: "The whole story of Brunelleschi’s Dome, the symbol of the city",
    category: "museum",
    position: [43.7733279, 11.2579865],
  },
  {
    id: "bargello",
    title: "Museo del Bargello",
    description: "Famous for sculpture",
    category: "museum",
    position: [43.7703791, 11.2582616],
  },
];

const FLORENCE_FOOD: FlorenceMapSuggestion[] = [
  {
    id: "quattro-leoni",
    title: "Trattoria 4 Leoni",
    description: "Informal classic Florentine food",
    category: "food",
    position: [43.7670805, 11.2503862],
  },
  {
    id: "trattoria-carmine",
    title: "Trattoria del Carmine",
    description: "Informal classic Florentine food",
    category: "food",
    position: [43.7694399, 11.2448339],
  },
  {
    id: "vini-vecchi-sapori",
    title: "Vini e Vecchi Sapori",
    description: "Informal classic Florentine food",
    category: "food",
    position: [43.7700693, 11.2568008],
  },
  {
    id: "latini",
    title: "Il Latini",
    description: "Famous for their Florentine steak",
    category: "food",
    position: [43.7716039, 11.2493033],
  },
  {
    id: "frescobaldi",
    title: "Ristorante Frescobaldi",
    description: "Nice food and wines!",
    category: "food",
    position: [43.7699755, 11.2564494],
  },
  {
    id: "orazio",
    title: "da Orazio",
    description: "Street food — with the typical lampredotto sandwich",
    category: "food",
    position: [43.7698607, 11.2540178],
    query: "Trippaio del Porcellino, Piazza del Mercato Nuovo, Florence, Italy",
  },
  {
    id: "antico-vinaio",
    title: "Antico Vinaio",
    description: "World-famous for their hot, stuffed schiacciata",
    category: "food",
    position: [43.7684668, 11.2574228],
    query: "All’Antico Vinaio, Via dei Neri, Florence, Italy",
  },
  {
    id: "amble",
    title: "Amblé",
    description: "Bistro with gourmet sandwiches",
    category: "food",
    position: [43.7690931, 11.2526283],
  },
  {
    id: "sprone",
    title: "Pizzeria Lo Sprone",
    description: "Wood-fired oven pizza",
    category: "food",
    position: [43.7673495, 11.2504744],
  },
  {
    id: "vivoli",
    title: "Gelateria Vivoli",
    description: "Best ice cream in town — you will enjoy it at the party as well",
    category: "food",
    position: [43.769939, 11.2601058],
  },
  {
    id: "passera",
    title: "Gelateria della Passera",
    description: "Award-winning artisanal gelato",
    category: "food",
    position: [43.7671815, 11.2506436],
  },
  {
    id: "venchi",
    title: "Venchi Icecream and Chocolate",
    category: "food",
    position: [43.7717831, 11.2552615],
    query: "Venchi Firenze",
  },
];

const FLORENCE_WALK: FlorenceMapSuggestion[] = [
  {
    id: "santo-spirito",
    title: "Basilica di Santo Spirito",
    category: "tour",
    order: 1,
    position: [43.7674301, 11.2484144],
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Basilica_di_Santo_Spirito_2%2C_Florence.jpg/500px-Basilica_di_Santo_Spirito_2%2C_Florence.jpg",
    photoSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Basilica_di_Santo_Spirito_2,_Florence.jpg",
  },
  {
    id: "palazzo-pitti",
    title: "Palazzo Pitti",
    category: "tour",
    order: 2,
    position: [43.7652813, 11.2502566],
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Palazzo_Pitti_%28Florence%29_-_Facade_20150811.jpg/500px-Palazzo_Pitti_%28Florence%29_-_Facade_20150811.jpg",
    photoSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Palazzo_Pitti_(Florence)_-_Facade_20150811.jpg",
  },
  {
    id: "ponte-vecchio",
    title: "Ponte Vecchio",
    category: "tour",
    order: 3,
    position: [43.7680254, 11.253158],
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Ponte_Vecchio_at_dusk_1.JPG/500px-Ponte_Vecchio_at_dusk_1.JPG",
    photoSourceUrl: "https://commons.wikimedia.org/wiki/File:Ponte_Vecchio_at_dusk_1.JPG",
  },
  {
    id: "palazzo-vecchio",
    title: "Palazzo Vecchio",
    category: "tour",
    order: 4,
    position: [43.7691435, 11.2561399],
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Florence_-_tower_of_the_Palazzo_Vecchio.jpg/500px-Florence_-_tower_of_the_Palazzo_Vecchio.jpg",
    photoSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Florence_-_tower_of_the_Palazzo_Vecchio.jpg",
  },
  {
    id: "santa-croce",
    title: "Basilica di Santa Croce",
    category: "tour",
    order: 5,
    position: [43.768365, 11.2630201],
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Basilica_di_Santa_Croce_%2812437%29.jpg/500px-Basilica_di_Santa_Croce_%2812437%29.jpg",
    photoSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Basilica_di_Santa_Croce_(12437).jpg",
  },
  {
    id: "duomo",
    title: "Duomo di Firenze",
    category: "tour",
    order: 6,
    position: [43.7731455, 11.2556093],
    query: "Cattedrale di Santa Maria del Fiore, Firenze",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Facciata_duomo_di_firenze.jpg/500px-Facciata_duomo_di_firenze.jpg",
    photoSourceUrl: "https://commons.wikimedia.org/wiki/File:Facciata_duomo_di_firenze.jpg",
  },
  {
    id: "brunelleschi-dome",
    title: "Cupola del Brunelleschi",
    category: "tour",
    order: 7,
    position: [43.7733319, 11.2565651],
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Florence%2C_Italy%2C_Brunelleschi%27s_Dome_of_Florence_Cathedral.jpg/500px-Florence%2C_Italy%2C_Brunelleschi%27s_Dome_of_Florence_Cathedral.jpg",
    photoSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Florence,_Italy,_Brunelleschi%27s_Dome_of_Florence_Cathedral.jpg",
  },
  {
    id: "giotto-bell-tower",
    title: "Campanile di Giotto",
    category: "tour",
    order: 8,
    position: [43.7726042, 11.2558247],
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/CampanileGiotto-01.jpg/500px-CampanileGiotto-01.jpg",
    photoSourceUrl: "https://commons.wikimedia.org/wiki/File:CampanileGiotto-01.jpg",
  },
  {
    id: "baptistery",
    title: "Battistero di San Giovanni",
    category: "tour",
    order: 9,
    position: [43.7732999, 11.2550586],
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/South_Facade_of_Florence_Baptistery_March_2022.jpg/500px-South_Facade_of_Florence_Baptistery_March_2022.jpg",
    photoSourceUrl:
      "https://commons.wikimedia.org/wiki/File:South_Facade_of_Florence_Baptistery_March_2022.jpg",
  },
  {
    id: "santa-maria-novella",
    title: "Basilica di Santa Maria Novella",
    category: "tour",
    order: 10,
    position: [43.7746511, 11.2493727],
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Santa_Maria_Novella_Florence_fa%C3%A7ade.jpg/500px-Santa_Maria_Novella_Florence_fa%C3%A7ade.jpg",
    photoSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Santa_Maria_Novella_Florence_fa%C3%A7ade.jpg",
  },
];

function florenceMapsUrl(suggestion: FlorenceMapSuggestion) {
  const query = suggestion.query ?? `${suggestion.title}, Florence, Italy`;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function FlorenceSuggestions() {
  type FlorenceLayer = "museum" | "food" | "tour";

  const [activeLayers, setActiveLayers] = useState<FlorenceLayer[]>(["food"]);
  const activeSuggestions = useMemo(
    () => [
      ...(activeLayers.includes("museum") ? FLORENCE_MUSEUMS : []),
      ...(activeLayers.includes("food") ? FLORENCE_FOOD : []),
      ...(activeLayers.includes("tour") ? FLORENCE_WALK : []),
    ],
    [activeLayers],
  );

  function toggleLayer(layer: FlorenceLayer) {
    setActiveLayers((currentLayers) => {
      if (!currentLayers.includes(layer)) {
        return [...currentLayers, layer];
      }

      return currentLayers.length === 1
        ? currentLayers
        : currentLayers.filter((currentLayer) => currentLayer !== layer);
    });
  }

  return (
    <section data-block-type="florence_suggestions" className={styles.florenceBlock}>
      <div className={styles.florenceInner}>
        <details
          className={styles.florenceDetails}
          data-testid="florence-suggestions-details"
        >
          <summary className={styles.florenceSummary}>
            <span className={styles.florenceSummaryIcon} aria-hidden="true">
              <MapPin size={24} strokeWidth={1.6} />
            </span>
            <span className={styles.florenceSummaryCopy}>
              <span className={styles.florenceEyebrow}>Our local guide</span>
              <span className={styles.florenceTitle}>Welcome to Florence!</span>
              <span className={styles.florenceSummaryNote}>
                Museums, food and a guided city walk
              </span>
            </span>
            <span className={styles.florenceToggle} aria-hidden="true" />
          </summary>

          <div className={styles.florenceContent}>
            <header className={styles.florenceIntro}>
              <p>
                Here are some tips to help you get an authentic and delicious taste of the
                city!
              </p>
            </header>

            <section className={styles.florenceMapSection} aria-labelledby="florence-map-title">
              <div className={styles.florenceMapHeading}>
                <div>
                  <span className={styles.florenceMapEyebrow}>Select one or more</span>
                  <h3 id="florence-map-title">Explore Florence</h3>
                </div>
                <div
                  className={styles.florenceMapFilters}
                  role="group"
                  aria-label="Florence map layers"
                >
                  <button
                    type="button"
                    aria-pressed={activeLayers.includes("museum")}
                    className={
                      activeLayers.includes("museum")
                        ? styles.florenceMapFilterActive
                        : undefined
                    }
                    onClick={() => toggleLayer("museum")}
                  >
                    <Landmark size={18} strokeWidth={1.6} aria-hidden="true" />
                    Museums
                  </button>
                  <button
                    type="button"
                    aria-pressed={activeLayers.includes("food")}
                    className={
                      activeLayers.includes("food")
                        ? styles.florenceMapFilterActive
                        : undefined
                    }
                    onClick={() => toggleLayer("food")}
                  >
                    <UtensilsCrossed size={18} strokeWidth={1.6} aria-hidden="true" />
                    Food
                  </button>
                  <button
                    type="button"
                    aria-pressed={activeLayers.includes("tour")}
                    className={
                      activeLayers.includes("tour")
                        ? styles.florenceMapFilterActive
                        : undefined
                    }
                    onClick={() => toggleLayer("tour")}
                  >
                    <Footprints size={18} strokeWidth={1.6} aria-hidden="true" />
                    Guided city walk
                  </button>
                </div>
              </div>

              {activeLayers.includes("tour") ? (
                <ol className={styles.florenceRouteStops} aria-label="Guided city walk order">
                  {FLORENCE_WALK.map((stop) => (
                    <li key={stop.id}>
                      <a
                        href={florenceMapsUrl(stop)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span aria-hidden="true">{stop.order}</span>
                        {stop.title}
                      </a>
                    </li>
                  ))}
                </ol>
              ) : null}

              <FlorenceMap
                key={activeLayers.slice().sort().join("-")}
                suggestions={activeSuggestions}
              />
            </section>
          </div>
        </details>
      </div>
    </section>
  );
}

function GroupGift() {
  return (
    <section data-block-type="group_gift" className={styles.giftBlock}>
      <div className={styles.giftOuter}>
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
