"use client";

import { useEffect, useState, useTransition } from "react";

import type { AttendanceStatus, Guest, PartyResponse, Question } from "@/lib/types";

interface RsvpModalProps {
  open: boolean;
  partyLabel: string;
  guests: Guest[];
  questions: Question[];
  token: string;
  readOnly: boolean;
  initialResponse?: PartyResponse;
  preferredStatus?: AttendanceStatus;
  onClose: () => void;
  onSubmitted: (response: PartyResponse) => void;
}

const PARTY_QUESTION_ID = "question_party";
const WALKING_DINNER_QUESTION_ID = "question_walking_dinner";

function isImpliedPartyQuestion(question: Question) {
  return question.id === PARTY_QUESTION_ID;
}

function hasWalkingDinnerQuestion(questions: Question[]) {
  return questions.some((question) => question.id === WALKING_DINNER_QUESTION_ID);
}

function buildGuestSelections(guests: Guest[], status: AttendanceStatus) {
  return Object.fromEntries(
    guests.map((guest) => [guest.id, status === "attending"]),
  );
}

function buildAnswers(
  questions: Question[],
  response: PartyResponse | undefined,
  status: AttendanceStatus,
  implyParty: boolean,
) {
  return Object.fromEntries(
    questions.map((question) => [
      question.id,
      status === "attending"
        ? (implyParty && isImpliedPartyQuestion(question)) || response?.answers[question.id] || false
        : false,
    ]),
  );
}

function normalizeAnswers(
  questions: Question[],
  answers: Record<string, boolean>,
  status: AttendanceStatus,
  implyParty: boolean,
) {
  return Object.fromEntries(
    questions.map((question) => [
      question.id,
      status === "attending"
        ? (implyParty && isImpliedPartyQuestion(question)) || Boolean(answers[question.id])
        : false,
    ]),
  );
}

export function RsvpModal({
  open,
  partyLabel,
  guests,
  questions,
  token,
  readOnly,
  initialResponse,
  preferredStatus,
  onClose,
  onSubmitted,
}: RsvpModalProps) {
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>(
    preferredStatus ?? initialResponse?.status ?? "attending",
  );
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState(initialResponse?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasWalkingDinnerOption = hasWalkingDinnerQuestion(questions);
  const implyParty = !hasWalkingDinnerOption;
  const visibleQuestions = questions.filter(
    (question) => hasWalkingDinnerOption || !isImpliedPartyQuestion(question),
  );

  useEffect(() => {
    if (!open) return;
    const status = preferredStatus ?? initialResponse?.status ?? "attending";
    setAttendanceStatus(status);
    setAnswers(buildAnswers(questions, initialResponse, status, implyParty));
    setNote(initialResponse?.note ?? "");
    setError(null);
  }, [guests, implyParty, initialResponse, open, preferredStatus, questions]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-8 backdrop-blur-sm">
      <div className="paper-panel max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-[var(--app-line)] p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="section-label">RSVP</div>
            <h2 className="mt-3 font-display text-4xl text-stone-950">
              Will you attend, {partyLabel}?
            </h2>
            <p className="mt-2 text-base text-stone-700">Bona and Alessandro Maniscalco</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--app-line)] px-3 py-2 text-sm text-stone-600"
          >
            Close
          </button>
        </div>

        {readOnly ? (
          <div className="mt-5 rounded-2xl border border-[var(--app-line)] bg-white/85 px-4 py-4 text-sm text-stone-700">
            RSVP is closed for this invitation.
          </div>
        ) : null}

        <div className="mt-6 inline-flex rounded-full border border-[var(--app-line)] bg-white p-1">
          {(["attending", "not_attending"] as const).map((status) => (
            <button
              key={status}
              type="button"
              disabled={readOnly}
              onClick={() => {
                setAttendanceStatus(status);
                setAnswers(buildAnswers(questions, initialResponse, status, implyParty));
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                attendanceStatus === status
                  ? "bg-[var(--app-wine)] text-white"
                  : "text-stone-600"
              }`}
            >
              {status === "attending" ? "Will attend" : "Will not attend"}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-5">
          {attendanceStatus === "attending" ? (
            visibleQuestions.length > 0 ? (
              <div>
                <div className="text-sm font-semibold text-stone-800">
                  Before you leave, kindly select your preferences below
                </div>
                <div className="mt-3 space-y-3">
                  {visibleQuestions.map((question) => (
                    <label
                      key={question.id}
                      className="flex items-center gap-3 rounded-2xl border border-[var(--app-line)] bg-white/80 px-4 py-3"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(answers[question.id])}
                        disabled={readOnly}
                        onChange={(event) =>
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-stone-300 text-[var(--app-wine)]"
                      />
                      <span>{question.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null
          ) : null}

          <label className="block">
            <span className="text-sm font-semibold text-stone-800">Private message</span>
            <textarea
              value={note}
              disabled={readOnly}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              placeholder="Private message to host (optional)"
              className="mt-3 w-full rounded-2xl border border-[var(--app-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--app-wine)]"
            />
          </label>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--app-line)] px-5 py-3 text-sm font-semibold text-stone-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={readOnly || isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const selections = buildGuestSelections(guests, attendanceStatus);
                const normalizedAnswers = normalizeAnswers(
                  questions,
                  answers,
                  attendanceStatus,
                  implyParty,
                );
                const response = await fetch("/api/rsvp", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    token,
                    selections,
                    answers: normalizedAnswers,
                    note,
                  }),
                });

                if (!response.ok) {
                  const payload = (await response.json().catch(() => null)) as
                    | { error?: string }
                    | null;
                  setError(payload?.error ?? "Unable to submit RSVP.");
                  return;
                }

                const payload = (await response.json()) as { response: PartyResponse };
                onSubmitted(payload.response);
                onClose();
              })
            }
            className="rounded-full bg-[var(--app-wine)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
