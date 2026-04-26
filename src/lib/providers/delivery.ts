import { Resend } from "resend";

import { env, hasResendConfig } from "@/lib/env";
import { renderInvitationEmail } from "@/lib/providers/email-template";
import type { DeliveryChannel, DeliveryKind } from "@/lib/types";

interface DispatchDeliveryInput {
  channel: DeliveryChannel;
  recipient: string;
  inviteUrl: string;
  partyLabel: string;
  eventTitle: string;
  kind: DeliveryKind;
  summaryDateLabel?: string;
  summaryAddressName?: string;
  summaryAddressLabel?: string;
  rsvpDeadline?: string;
  heroImageSrc?: string;
  mapUrl?: string;
}

interface DispatchDeliveryResult {
  status: "sandbox" | "sent" | "queued" | "failed";
  providerMessageId?: string;
  sandbox: boolean;
  subjectLine: string;
  bodyPreview: string;
}

export async function dispatchDelivery(
  input: DispatchDeliveryInput,
): Promise<DispatchDeliveryResult> {
  const email = renderInvitationEmail({
    appUrl: env.APP_URL,
    inviteUrl: input.inviteUrl,
    partyLabel: input.partyLabel,
    eventTitle: input.eventTitle,
    kind: input.kind,
    summaryDateLabel: input.summaryDateLabel,
    summaryAddressName: input.summaryAddressName,
    summaryAddressLabel: input.summaryAddressLabel,
    rsvpDeadline: input.rsvpDeadline,
    heroImageSrc: input.heroImageSrc,
    mapUrl: input.mapUrl,
  });

  if (!hasResendConfig()) {
    return {
      status: "sandbox",
      sandbox: true,
      subjectLine: email.subjectLine,
      bodyPreview: email.bodyPreview,
    };
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const response = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL!,
    to: input.recipient,
    subject: email.subjectLine,
    text: email.text,
    html: email.html,
    replyTo: env.RESEND_REPLY_TO_EMAIL,
  });

  return {
    status: response.error ? "failed" : "sent",
    providerMessageId: response.data?.id,
    sandbox: false,
    subjectLine: email.subjectLine,
    bodyPreview: email.bodyPreview,
  };
}
