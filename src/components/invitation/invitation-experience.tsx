"use client";

import { useMemo, useRef, useState } from "react";

import Image from "next/image";
import { Play, RefreshCw } from "lucide-react";

import { AccommodationCarousel } from "@/components/invitation/accommodation-carousel";
import { RsvpModal } from "@/components/invitation/rsvp-modal";
import { cn, formatDeadline, formatTimestamp, partyAttendanceSummary } from "@/lib/formatters";
import type { AttendanceStatus, InvitationView, PartyResponse } from "@/lib/types";

import styles from "./invitation-experience.module.css";

export function InvitationExperience({ invitation }: { invitation: InvitationView }) {
  const [stage, setStage] = useState(2);
  const [modalOpen, setModalOpen] = useState(false);
  const [preferredStatus, setPreferredStatus] = useState<AttendanceStatus | undefined>(undefined);
  const [response, setResponse] = useState<PartyResponse | undefined>(invitation.party.response);
  const detailsRef = useRef<HTMLDivElement | null>(null);

  const party = useMemo(
    () => ({
      ...invitation.party,
      response,
    }),
    [invitation.party, response],
  );

  const summary = partyAttendanceSummary(party, invitation.guests);

  function openRsvp(status?: AttendanceStatus) {
    setPreferredStatus(status);
    setModalOpen(true);
  }

  function advanceScene() {
    setStage((current) => {
      if (current === 1) return 2;
      if (current === 2) return 1;
      if (current === 3) return 1;
      return 1;
    });
  }

  function flipCard() {
    setStage((current) => (current === 3 ? 2 : 3));
  }

  return (
    <main className={styles.shell}>
      <section
        className={styles.hero}
        style={{ backgroundImage: `url(${invitation.event.heroBackdropSrc})` }}
      >
        <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-end gap-4 px-6 py-6 text-sm text-stone-900">
          <button
            type="button"
            onClick={() => openRsvp()}
            className="rounded-full bg-white px-4 py-2 font-semibold text-[var(--app-wine)] shadow-sm"
          >
            RSVP
          </button>
        </div>

        <div className={styles.scene}>
          <div className={styles.previewFrame}>
            <div className={styles.controlRail}>
              <button
                type="button"
                onClick={flipCard}
                aria-label="Flip invitation card"
                className={styles.controlButton}
              >
                <RefreshCw size={18} strokeWidth={1.9} />
              </button>
              <button
                type="button"
                onClick={advanceScene}
                aria-label="Advance invitation preview"
                className={styles.controlButton}
              >
                <Play size={18} fill="currentColor" strokeWidth={1.9} />
              </button>
            </div>
            <div className={styles.stack}>
              <div className={cn(styles.flap, stage > 0 && styles.flapOpen)} />
              <div
                className={cn(
                  styles.card,
                  stage >= 1 && styles.cardPeek,
                  stage >= 2 && styles.cardFrontStage,
                  stage >= 3 && styles.cardBackStage,
                )}
              >
                <div className={cn(styles.cardFace, styles.cardFrontFace)}>
                  <div
                    className={styles.cardBackdrop}
                    style={{ backgroundImage: `url(${invitation.event.heroImageSrc})` }}
                  />
                  <div className="absolute inset-x-0 top-0 h-28 bg-white/72 backdrop-blur-[1px]" />
                  <div className="absolute inset-x-0 top-7 flex items-center justify-center gap-5 text-[rgba(90,31,45,0.68)]">
                    <span className="font-display text-6xl">{invitation.event.heroMonogram.split(" ")[0]}</span>
                    <h1 className="font-display text-3xl tracking-[0.08em] text-stone-900 sm:text-4xl">
                      {invitation.event.summaryName}
                    </h1>
                    <span className="font-display text-6xl">{invitation.event.heroMonogram.split(" ")[1]}</span>
                  </div>
                </div>
                <div className={cn(styles.cardFace, styles.cardBackFace)}>
                  <div className={styles.cardPaper} />
                  <div className="absolute inset-4 border-[5px] border-[rgba(90,31,45,0.78)]" />
                  <div className="relative flex h-full flex-col items-center justify-center px-10 py-16 text-center text-[rgba(78,41,38,0.96)]">
                    <div className="font-display text-4xl tracking-[0.08em]">
                      {invitation.event.summaryName}
                    </div>
                    <div className="mt-10 font-display text-5xl italic">Walking Dinner</div>
                    <div className="mt-2 text-xl">Thursday 27th</div>
                    <div className="mt-4 font-display text-4xl">
                      Ristorante Frescobaldi Firenze
                    </div>
                    <div className="mt-2 text-xl">19h30</div>
                    <div className="mt-1 text-lg">Casual Chic</div>
                    <div className="mt-8 h-px w-56 bg-[rgba(90,31,45,0.64)]" />
                    <div className="mt-8 font-display text-5xl italic">Party</div>
                    <div className="mt-2 text-xl">Friday 28th</div>
                    <div className="mt-4 font-display text-4xl">Villa I Collazzi</div>
                    <div className="mt-2 text-xl">19h30</div>
                    <div className="mt-1 text-lg">{invitation.event.dressCode}</div>
                  </div>
                </div>
              </div>
              <div className={styles.envelope} />
            </div>
          </div>
        </div>
      </section>

      <section ref={detailsRef} className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <div className="paper-panel rounded-[2rem] border border-[var(--app-line)] px-8 py-12 sm:px-10 sm:py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-display text-5xl text-stone-950 sm:text-6xl">
              {invitation.event.summaryName}
            </h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => openRsvp("attending")}
                className={`rounded-[0.2rem] border px-8 py-4 text-sm font-semibold tracking-[0.24em] uppercase ${
                  response?.status === "attending"
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-700 bg-transparent text-stone-900"
                }`}
              >
                Will Attend
              </button>
              <button
                type="button"
                onClick={() => openRsvp("not_attending")}
                className={`rounded-[0.2rem] border px-8 py-4 text-sm font-semibold tracking-[0.24em] uppercase ${
                  response?.status === "not_attending"
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-700 bg-transparent text-stone-900"
                }`}
              >
                Will Not Attend
              </button>
            </div>

            <div className="mt-8 text-sm text-stone-600">
              {party.label} · {summary}
              <span className="mx-2">·</span>
              Deadline {formatDeadline(invitation.event.rsvpDeadline)}
              {response ? (
                <>
                  <span className="mx-2">·</span>
                  Updated {formatTimestamp(response.updatedAt)}
                </>
              ) : null}
            </div>
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl gap-10 text-center lg:grid-cols-2">
            <div>
              <div className="section-label">Date</div>
              <div className="mt-4 text-2xl leading-10 text-stone-900">
                {invitation.event.summaryDateLabel}
              </div>
            </div>
            <div>
              <div className="section-label">Address</div>
              <div className="mt-4 font-display text-4xl text-stone-900">
                {invitation.event.summaryAddressName}
              </div>
              <div className="mt-2 text-lg text-stone-700">{invitation.event.summaryAddressLabel}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-8">
          {invitation.itinerary.map((item) => (
            <article
              key={item.id}
              className="paper-panel overflow-hidden rounded-[2rem] border border-[var(--app-line)] px-6 py-10 sm:px-8 sm:py-12"
            >
              <div className="section-label text-center">{item.dayLabel}</div>
              <div className="relative mx-auto mt-8 min-h-[18rem] w-full max-w-5xl overflow-hidden rounded-[0.2rem]">
                <div className="relative min-h-[18rem]">
                  <Image
                    src={item.imageSrc}
                    alt={item.venueName}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 55vw, 100vw"
                  />
                </div>
              </div>
              <div className="mx-auto mt-8 max-w-3xl text-center">
                <a
                  href={item.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-display text-4xl text-stone-900 underline underline-offset-4"
                >
                  {item.venueName}
                </a>
                <div className="mt-2 text-lg text-stone-700 underline decoration-stone-300 underline-offset-4">
                  {item.address}
                </div>
                <div className="mt-10 text-2xl text-stone-900">{item.title}</div>
                <div className="mt-3 text-lg text-stone-700">{item.datetimeLabel}</div>
                <div className="mt-2 text-lg text-stone-700">{item.dressCode}</div>
                <p className="mt-5 text-base leading-8 text-stone-700">{item.description}</p>
              </div>
            </article>
          ))}
        </div>

        <AccommodationCarousel cards={invitation.accommodations} />
      </section>

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
