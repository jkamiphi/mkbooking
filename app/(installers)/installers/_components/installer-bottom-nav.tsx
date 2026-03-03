"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardCheck, LogOut } from "lucide-react";
import { useState } from "react";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function InstallerBottomNav() {
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

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <Link
          href="/installers/tasks"
          className={cn(
            "flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition",
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
          className="flex h-11 min-w-28 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          {isSigningOut ? "Saliendo" : "Salir"}
        </button>
      </div>
    </nav>
  );
}
