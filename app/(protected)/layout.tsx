import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserSidebar } from "@/components/user/user-sidebar";

export default async function ProtectedLayout({
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

  const profile = await db.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { systemRole: true },
  });

  if (profile?.systemRole === "INSTALLER") {
    redirect("/installers/tasks");
  }

  return (
    <div className="min-h-dvh bg-[#f4f7fb] lg:h-dvh lg:overflow-hidden">
      <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row">
        <UserSidebar
          user={{
            email: session.user.email,
            name: session.user.name,
          }}
        />
        <main className="min-w-0 flex-1 lg:h-dvh lg:overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
