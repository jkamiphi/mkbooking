import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveAuthenticatedEntryPath } from "@/lib/navigation/role-home";

export default async function OnboardingLayout({
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

  if (profile?.systemRole && profile.systemRole !== "CUSTOMER") {
    redirect(
      await resolveAuthenticatedEntryPath({
        userId: session.user.id,
        systemRole: profile.systemRole,
        isActive: profile.isActive,
      }),
    );
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top_left,_rgba(252,184,20,0.16),_transparent_26%),linear-gradient(180deg,_#f6f9ff_0%,_#ffffff_54%,_#fffdf7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-7xl flex-col">
        <header className="mb-6 flex items-center justify-between gap-4 rounded-md border border-mkmedia-blue/12 bg-white/72 px-4 py-3 shadow-[0_20px_60px_-42px_rgba(3,89,168,0.35)] backdrop-blur sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-neutral-950"
          >
            <Image
              src="/images/logo/b-mkm-blue.png"
              alt="Logo MK MEDIA"
              width={80}
              height={40}
              className="h-10 w-auto"
            />
            <div>
              <p className="text-neutral-600">Setup inicial de cuenta</p>
            </div>
          </Link>

          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition hover:text-neutral-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Ir al perfil
          </Link>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
