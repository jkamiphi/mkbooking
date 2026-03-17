import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolveActiveOrganizationContextForUser } from "@/lib/services/organization-access";
import { StarterSetupContent } from "@/components/onboarding/starter-setup-content";

export const metadata = {
  title: "Setup inicial - MK Booking",
  description: "Configura tu primer espacio operativo segun tu tipo de cuenta.",
};

export default async function OnboardingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const organizationState = await resolveActiveOrganizationContextForUser(
    session.user.id,
  );

  if (organizationState.hasAccessibleContexts) {
    redirect("/profile");
  }

  return <StarterSetupContent />;
}
