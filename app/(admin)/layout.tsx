import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { resolveAuthenticatedEntryPath } from "@/lib/navigation/role-home";
import { AdminSidebar } from "./_components/admin-sidebar";
import { AdminHeader } from "./_components/admin-header";
import type { SystemRole } from "@prisma/client";

export default async function AdminLayout({
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

  if (
    !profile ||
    !["SUPERADMIN", "STAFF", "DESIGNER", "SALES", "OPERATIONS_PRINT"].includes(
      profile.systemRole
    )
  ) {
    redirect(
      await resolveAuthenticatedEntryPath({
        userId: session.user.id,
        systemRole: profile?.systemRole,
        isActive: profile?.isActive,
      }),
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <AdminHeader
        user={session.user}
        systemRole={profile.systemRole as SystemRole}
      />
      <div className="flex min-h-[calc(100dvh-4rem)]">
        <AdminSidebar systemRole={profile.systemRole as SystemRole} />
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
