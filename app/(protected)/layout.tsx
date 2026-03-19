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
    select: { systemRole: true, isActive: true },
  });

  if (profile?.isActive === false) {
    redirect("/inactive");
  }

  if (profile?.systemRole === "INSTALLER") {
    redirect("/installers/tasks");
  }

  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#fbfbfc_0%,#f4f5f7_100%)] lg:h-dvh lg:overflow-hidden">
      <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row">
        <UserSidebar
          user={{
            email: session.user.email,
            name: session.user.name,
          }}
        />
        <main className="min-w-0 flex-1 bg-transparent lg:h-dvh lg:overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
