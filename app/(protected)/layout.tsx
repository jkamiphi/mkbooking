import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#fffdf5_0%,_#ffffff_45%,_#f4f7ff_100%)] text-neutral-950">
      <style>{`
        @keyframes drift {
          0% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(-10px, 12px, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
      `}</style>

      <div
        className="pointer-events-none absolute -top-32 right-0 h-80 w-80 rounded-full bg-[#fcb814]/30 blur-3xl"
        style={{ animation: "drift 18s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-[#0359A8]/20 blur-3xl"
        style={{ animation: "drift 14s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-16 h-40 w-40 -translate-x-1/2 rounded-full bg-[#0359A8]/15 blur-2xl"
        style={{ animation: "drift 20s ease-in-out infinite" }}
      />

      <header className="relative mx-auto flex w-full max-w-7xl items-start justify-between px-6 pb-6 pt-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0359A8] text-white shadow-lg shadow-[#0359A8]/30">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
              MK Booking
            </p>
            <p className="text-lg font-semibold tracking-tight">Catálogo OOH</p>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-600">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="relative">{children}</main>
    </div>
  );
}
