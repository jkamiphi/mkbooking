"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardCheck, LogOut } from "lucide-react";
import { useState } from "react";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface InstallerBottomNavProps {
  mode?: "mobile" | "desktop";
  className?: string;
}

export function InstallerBottomNav({ mode = "mobile", className }: InstallerBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  const tasksActive = pathname.startsWith("/installers/tasks");

  if (mode === "desktop") {
    return (
      <div className={cn("hidden items-center gap-2 lg:flex", className)}>
        <Link
          href="/installers/tasks"
          className={cn(
            "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-medium transition",
            tasksActive
              ? "border-[#0359A8] bg-[#0359A8]/8 text-[#0359A8]"
              : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
          )}
        >
          <ClipboardCheck className="h-3.5 w-3.5" />
          Tareas
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
        >
          <LogOut className="h-3.5 w-3.5" />
          {isSigningOut ? "Saliendo..." : "Salir"}
        </button>
      </div>
    );
  }

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden",
        className
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <Link
          href="/installers/tasks"
          className={cn(
            "flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border text-sm font-medium transition",
            tasksActive
              ? "border-[#0359A8] bg-[#0359A8]/8 text-[#0359A8]"
              : "border-neutral-200 bg-white text-neutral-600"
          )}
        >
          <ClipboardCheck className="h-4 w-4" />
          Tareas
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="flex h-11 min-w-28 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          {isSigningOut ? "Saliendo..." : "Salir"}
        </button>
      </div>
    </nav>
  );
}
