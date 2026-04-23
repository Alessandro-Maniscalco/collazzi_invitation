import { Resend } from "resend";
import Twilio from "twilio";

import { env, hasResendConfig, hasTwilioConfig } from "@/lib/env";
import type { DeliveryChannel, DeliveryKind } from "@/lib/types";

interface DispatchDeliveryInput {
  channel: DeliveryChannel;
  recipient: string;
  inviteUrl: string;
  partyLabel: string;
  eventTitle: string;
  kind: DeliveryKind;
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
  const subjectLine =
    input.kind === "invite"
      ? `${input.eventTitle} invitation for ${input.partyLabel}`
      : `Reminder: ${input.eventTitle}`;

  const bodyPreview =
    input.kind === "invite"
      ? `Open your invitation: ${input.inviteUrl}`
      : `Reminder link: ${input.inviteUrl}`;

  if (input.channel === "email") {
    if (!hasResendConfig()) {
      return {
        status: "sandbox",
        sandbox: true,
        subjectLine,
        bodyPreview,
      };
    }

    const resend = new Resend(env.RESEND_API_KEY);
    const response = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL!,
      to: input.recipient,
      subject: subjectLine,
      text: `${input.partyLabel},\n\n${bodyPreview}\n\nThis invitation link is private to your party.`,
      html: `<p>${input.partyLabel},</p><p><a href="${input.inviteUrl}">Open your invitation</a></p><p>This invitation link is private to your party.</p>`,
    });

    return {
      status: response.error ? "failed" : "sent",
      providerMessageId: response.data?.id,
      sandbox: false,
      subjectLine,
      bodyPreview,
    };
  }

  if (!hasTwilioConfig()) {
    return {
      status: "sandbox",
      sandbox: true,
      subjectLine,
      bodyPreview,
    };
  }

  const client = Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  const message = await client.messages.create({
    from: env.TWILIO_FROM_PHONE,
    to: input.recipient,
    body: `${subjectLine}\n${input.inviteUrl}`,
  });

  return {
    status: "queued",
    providerMessageId: message.sid,
    sandbox: false,
    subjectLine,
    bodyPreview,
  };
}
