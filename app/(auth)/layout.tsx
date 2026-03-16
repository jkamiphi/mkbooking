import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveAuthenticatedEntryPath } from "@/lib/navigation/role-home";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect authenticated users to their role home
  if (session) {
    const profile = await db.userProfile.findUnique({
      where: { userId: session.user.id },
      select: { systemRole: true },
    });
    redirect(
      await resolveAuthenticatedEntryPath({
        userId: session.user.id,
        systemRole: profile?.systemRole,
      }),
    );
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top_left,_rgba(252,184,20,0.16),_transparent_28%),linear-gradient(180deg,_#f6f9ff_0%,_#ffffff_52%,_#fffdf6_100%)] lg:grid lg:grid-cols-[minmax(420px,1fr)_1fr]">
      {/* Form side */}
      <div className="flex min-h-dvh items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Image side — full-bleed right */}
      <section className="relative hidden overflow-hidden lg:block">
        <Image
          src="/images/panama.webp"
          alt="Pantalla digital de publicidad exterior"
          fill
          priority
          className="object-cover"
          sizes="(min-width: 1024px) 50vw, 0vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(156deg,rgba(3,89,168,0.84)_0%,rgba(3,89,168,0.7)_44%,rgba(3,89,168,0.34)_75%,rgba(252,184,20,0.18)_100%)]" />

        <div className="relative z-10 flex h-full w-full flex-col justify-between p-8 xl:p-10">
          <div className="space-y-5">
            <Image
              src="/images/logo/b-mkm-white.png"
              alt="Logo MK MEDIA"
              width={164}
              height={84}
              className="h-auto w-40"
            />
          </div>

          <div className="max-w-md space-y-3">
            <h2 className="text-2xl font-semibold leading-tight text-white lg:text-3xl">
              Conecta marcas, agencias y espacios publicitarios en un solo
              lugar.
            </h2>
          </div>
        </div>
      </section>
    </div>
  );
}
