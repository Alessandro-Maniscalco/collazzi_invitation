const FULL_RSVP_ACCESS_SOURCE = "diana";

export function hasFullRsvpAccess(source?: string) {
  return source?.trim().toLocaleLowerCase() === FULL_RSVP_ACCESS_SOURCE;
}

export function isDeclineResponse(selections: Record<string, boolean>) {
  return !Object.values(selections).some(Boolean);
}

export function assertRsvpChangeAllowed(
  source: string | undefined,
  selections: Record<string, boolean>,
) {
  if (!hasFullRsvpAccess(source) && !isDeclineResponse(selections)) {
    throw new Error(
      "RSVPs are closed. You can still change your response to Will not attend.",
    );
  }
}
