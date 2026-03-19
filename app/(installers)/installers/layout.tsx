import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/trpc/server";
import { db } from "@/lib/db";
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

  const profile = await db.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { systemRole: true, isActive: true },
  });

  if (profile?.isActive === false) {
    redirect("/inactive");
  }

  if (!profile || profile.systemRole !== "INSTALLER") {
    redirect(
      await resolveAuthenticatedEntryPath({
        userId: session.user.id,
        systemRole: profile?.systemRole,
        isActive: profile?.isActive,
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
