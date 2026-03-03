import { User } from "lucide-react";
import { InstallerBottomNav } from "./installer-bottom-nav";

interface InstallerAppShellProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email: string;
  };
}

export function InstallerAppShell({ children, user }: InstallerAppShellProps) {
  const displayName = user.name?.trim() || "Instalador";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_35%,#f6f7fb_100%)]">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/92 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              MK Booking Operativa
            </p>
            <h1 className="text-base font-semibold text-neutral-900">App de Instaladores</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-2.5 py-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
              <User className="h-4 w-4" />
            </span>
            <div className="max-w-[9rem] truncate text-right">
              <p className="truncate text-xs font-semibold text-neutral-900">{displayName}</p>
              <p className="truncate text-[11px] text-neutral-500">{user.email}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-4 sm:px-5">{children}</main>
      <InstallerBottomNav />
    </div>
  );
}
