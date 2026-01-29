import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AdminSidebar } from "./_components/admin-sidebar";
import { AdminHeader } from "./_components/admin-header";
import type { SystemRole } from "@prisma/client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Check system role
  const profile = await db.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { systemRole: true },
  });

  if (!profile || !["SUPERADMIN", "STAFF"].includes(profile.systemRole)) {
    // Redirect customers to their dashboard
    redirect("/profile");
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <AdminHeader
        user={session.user}
        systemRole={profile.systemRole as SystemRole}
      />
      <div className="flex">
        <AdminSidebar systemRole={profile.systemRole as SystemRole} />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
