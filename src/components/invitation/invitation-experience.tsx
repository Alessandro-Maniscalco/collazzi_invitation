"use client";

import { Fragment, useEffect, useState, useTransition, type FormEvent } from "react";

import Image from "next/image";
import { Play, RefreshCw } from "lucide-react";

import { AccommodationCarousel } from "@/components/invitation/accommodation-carousel";
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

function MultilineText({ text, className }: { text: string; className?: string }) {
  return (
    <p className={className}>
      {text.split("\n").map((line, index, lines) => (
        <Fragment key={`${line}-${index}`}>
          {line}
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
}: {
  venueName: string;
  address: string;
  mapUrl: string;
  compact?: boolean;
}) {
  return (
    <address className={styles.locationBlock}>
      <hr className={styles.locationRule} />
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

function TravelSubItem({ item }: { item: ItinerarySubItem }) {
  return (
    <div className={styles.travelTextItem}>
      {item.label ? <h4 className={styles.itemLabel}>{item.label}</h4> : null}
      {item.venueName && item.address && item.mapUrl ? (
        <LocationLink
          venueName={item.venueName}
          address={item.address}
          mapUrl={item.mapUrl}
          compact
        />
      ) : null}
      {item.note ? <MultilineText text={item.note} className={styles.itemNote} /> : null}
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

export function InvitationExperience({ invitation }: { invitation: InvitationView }) {
  const [stage, setStage] = useState(0);
  const [sequenceKey, setSequenceKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [preferredStatus, setPreferredStatus] = useState<AttendanceStatus | undefined>(undefined);
  const [response, setResponse] = useState<PartyResponse | undefined>(invitation.party.response);
  const [guestEmail, setGuestEmail] = useState(invitation.party.email ?? "");
  const [emailSaved, setEmailSaved] = useState(Boolean(invitation.party.email));
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isEmailPending, startEmailTransition] = useTransition();
  const party = { ...invitation.party, response };
  const stageClass =
    stage === 0
      ? styles.stageClosed
      : stage === 1
        ? styles.stageOpen
        : stage === 2
          ? styles.stagePeeking
          : stage === 3
            ? styles.stageExtracted
            : stage === 4
              ? styles.stageFront
              : styles.stageBack;

  useEffect(() => {
    setStage(0);
    const timers = [
      window.setTimeout(() => setStage(1), 360),
      window.setTimeout(() => setStage(2), 1120),
      window.setTimeout(() => setStage(3), 1820),
      window.setTimeout(() => setStage(4), 2520),
      window.setTimeout(() => setStage(5), 4400),
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [sequenceKey]);

  function openRsvp(status?: AttendanceStatus) {
    setPreferredStatus(status);
    setModalOpen(true);
  }

  function replayScene() {
    setSequenceKey((current) => current + 1);
  }

  function flipCard() {
    setStage((current) => (current === 5 ? 4 : 5));
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
      setEmailSaved(true);
    });
  }

  return (
    <main className={styles.shell}>
      <div className={styles.headerLogo} data-testid="custom-header-logo" aria-hidden="true">
        <div className={styles.logoBorder}>BA</div>
      </div>

      <section data-block-type="primary_media" className={styles.primaryMedia}>
        <div className={styles.mediaContainer}>
          <figure
            data-test="editor-media-modify-button"
            data-stage={stage}
            className={cn(styles.mediaInner, stageClass)}
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

            <div className={styles.stack}>
              <div className={styles.envelopeBack}>
                <div className={styles.envelopeBackFlap} />
                <div className={styles.envelopeBase} />
                <div className={styles.envelopeLiner} />
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
                <div className={styles.envelopeCover} />
                <div className={styles.envelopeFrontFlap} />
              </div>
            </div>
          </figure>
        </div>
      </section>

      {!invitation.party.email ? (
        <section data-block-type="email_capture" className={styles.emailCapture}>
          <div className={styles.emailCaptureInner}>
            {emailSaved ? (
              <div className={styles.emailSaved}>Email saved.</div>
            ) : (
              <form onSubmit={saveEmail} className={styles.emailForm}>
                <label className={styles.emailLabel} htmlFor="guest-email">
                  Email for updates
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
                <div className={styles.rsvpButtons}>
                  <button
                    type="button"
                    data-test="rsvp-button"
                    onClick={() => openRsvp("attending")}
                    className={cn(
                      styles.rsvpButton,
                      response?.status === "attending" && styles.rsvpButtonActive,
                    )}
                  >
                    Will attend
                  </button>
                  <button
                    type="button"
                    data-test="rsvp-button"
                    onClick={() => openRsvp("not_attending")}
                    className={cn(
                      styles.rsvpButton,
                      response?.status === "not_attending" && styles.rsvpButtonActive,
                    )}
                  >
                    Will not attend
                  </button>
                </div>
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

      <RsvpModal
        open={modalOpen}
        partyLabel={party.label}
        guests={invitation.guests}
        questions={invitation.questions}
        token={party.token.value}
        readOnly={invitation.readOnly}
        initialResponse={response}
        preferredStatus={preferredStatus}
        onClose={() => setModalOpen(false)}
        onSubmitted={setResponse}
      />
    </main>
  );
}
