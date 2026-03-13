import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveAuthenticatedEntryPath } from "@/lib/navigation/role-home";
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
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top_left,_rgba(252,184,20,0.16),_transparent_28%),linear-gradient(180deg,_#f6f9ff_0%,_#ffffff_52%,_#fffdf6_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.72fr)]">
        <section className="hidden min-h-[640px] overflow-hidden rounded-[2rem] border border-mkmedia-blue/15 bg-white/70 p-10 shadow-[0_32px_120px_-54px_rgba(3,89,168,0.38)] backdrop-blur lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-8">
            <div className="inline-flex items-center rounded-full border border-mkmedia-blue/20 bg-mkmedia-blue/8 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-mkmedia-blue [font-family:var(--font-mkmedia)]">
              MK MEDIA ACCESS
            </div>
            <div className="max-w-xl space-y-4">
              <h1 className="max-w-lg text-5xl font-semibold tracking-tight text-neutral-950">
                Accede a tu ecosistema de marcas, agencias y campanas.
              </h1>
              <p className="max-w-xl text-base leading-7 text-neutral-600">
                Un solo acceso para descubrir espacios, gestionar solicitudes y operar en nombre de tus marcas o de clientes compartidos.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-mkmedia-blue/15 bg-mkmedia-blue/6 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mkmedia-blue [font-family:var(--font-mkmedia)]">
                Multi contexto
              </p>
              <p className="mt-3 text-sm text-neutral-700">
                Cambia entre marcas propias, agencias y accesos compartidos sin salir de tu cuenta.
              </p>
            </div>
            <div className="rounded-3xl border border-mkmedia-blue/15 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mkmedia-blue [font-family:var(--font-mkmedia)]">
                Operacion clara
              </p>
              <p className="mt-3 text-sm text-neutral-700">
                Cada solicitud y orden respeta la organizacion activa con trazabilidad comercial.
              </p>
            </div>
            <div className="rounded-3xl border border-mkmedia-yellow/30 bg-mkmedia-yellow/18 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-900 [font-family:var(--font-mkmedia)]">
                Baja friccion
              </p>
              <p className="mt-3 text-sm text-neutral-700">
                Crea tu cuenta primero. Configura marca o agencia despues, cuando la necesites.
              </p>
            </div>
          </div>
        </section>

        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
