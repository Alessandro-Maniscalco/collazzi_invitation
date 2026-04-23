import { notFound } from "next/navigation";

import { InvitationExperience } from "@/components/invitation/invitation-experience";
import { getInvitationByToken, recordInviteOpen } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    notFound();
  }

  await recordInviteOpen(token);

  return <InvitationExperience invitation={invitation} />;
}
