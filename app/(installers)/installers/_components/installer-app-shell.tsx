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
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/92 px-3 py-3 backdrop-blur sm:px-4">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-8 items-center rounded-full border border-[#0359A8]/20 bg-[#0359A8]/8 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#0359A8] whitespace-nowrap">
              MKB Ops
            </span>
            <h1 className="truncate whitespace-nowrap text-sm font-semibold text-neutral-900 sm:text-base">
              Instaladores
            </h1>
          </div>
          <div className="flex min-w-0 items-center justify-end gap-2.5">
            <InstallerBottomNav mode="desktop" />
            <div className="flex min-w-0 max-w-[8.75rem] items-center gap-2 rounded-full border border-neutral-200 bg-white px-2.5 py-1.5 sm:max-w-[11rem] md:max-w-[13.5rem]">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                <User className="h-4 w-4" />
              </span>
              <div className="min-w-0 leading-tight text-left">
                <p className="truncate whitespace-nowrap text-xs font-semibold text-neutral-900">{displayName}</p>
                <p className="hidden truncate whitespace-nowrap text-[11px] text-neutral-500 lg:block">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 sm:px-5 lg:pb-8">{children}</main>
      <InstallerBottomNav />
    </div>
  );
}
