import { redirect } from "next/navigation";
import { createServerTRPCCaller, getServerSession } from "@/lib/trpc/server";
import { resolveAuthenticatedEntryPath } from "@/lib/navigation/role-home";
import { InstallerAppShell } from "./_components/installer-app-shell";

export default async function InstallersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  const caller = await createServerTRPCCaller();
  const profile = await caller.userProfile.current();

  if (!profile || profile.systemRole !== "INSTALLER") {
    redirect(
      await resolveAuthenticatedEntryPath({
        userId: session.user.id,
        systemRole: profile?.systemRole,
      }),
    );
  }

  return (
    <InstallerAppShell
      user={{
        email: session.user.email,
        name: session.user.name,
      }}
    >
      {children}
    </InstallerAppShell>
  );
}
