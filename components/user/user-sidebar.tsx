"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  ClipboardList,
  Home,
  LogOut,
  Package,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const primaryItems = [
  {
    href: "/profile",
    label: "Perfil",
    description: "Datos personales y preferencias",
    icon: UserRound,
    match: (path: string) => path === "/profile",
  },
  {
    href: "/campaign-requests",
    label: "Solicitudes",
    description: "Briefs y solicitudes de campaña",
    icon: ClipboardList,
    match: (path: string) => path.startsWith("/campaign-requests"),
  },
  {
    href: "/orders",
    label: "Órdenes",
    description: "Seguimiento y entregables",
    icon: Package,
    match: (path: string) => path.startsWith("/orders"),
  },
  {
    href: "/notifications",
    label: "Notificaciones",
    description: "Bandeja de hitos y alertas",
    icon: Bell,
    match: (path: string) => path.startsWith("/notifications"),
  },
] as const;

const utilityItems = [
  {
    href: "/",
    label: "Inicio",
    icon: Home,
  },
  {
    href: "/s/all",
    label: "Catálogo",
    icon: Search,
  },
] as const;

type UserSidebarProps = {
  user: {
    email: string;
    name?: string | null;
  };
};

function getInitials(name: string | null | undefined, email: string) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) {
    return email.charAt(0).toUpperCase();
  }

  return trimmed
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#fcb814] px-1.5 py-0.5 text-[10px] font-semibold text-neutral-900">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function UserSidebar({ user }: UserSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { data: unreadData } = trpc.notifications.unreadCount.useQuery();
  const unreadCount = unreadData?.count ?? 0;
  const initials = getInitials(user.name, user.email);
  const displayName = user.name?.trim() || "Mi cuenta";

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setIsSigningOut(false);
    }
  }

  return (
    <>
      <aside className="hidden border-r border-neutral-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[17.5rem] lg:flex-col">
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-neutral-200/80 px-5 pb-5 pt-6">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0359A8]/8 ring-1 ring-[#0359A8]/10">
                <Image
                  src="/images/logo/b-mkm-blue.png"
                  alt="MK Booking"
                  width={88}
                  height={44}
                  className="h-auto w-9"
                />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  MK Booking
                </p>
                <p className="truncate text-sm font-semibold text-neutral-950">
                  Mi cuenta
                </p>
              </div>
            </Link>

            <div className="mt-5 rounded-2xl border border-neutral-200/80 bg-white/90 p-3 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-sm font-semibold text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-950">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-neutral-500">{user.email}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="space-y-2">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                Workspace
              </p>
              {primaryItems.map((item) => {
                const isActive = item.match(pathname);
                const isNotifications = item.href === "/notifications";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group flex items-start gap-3 rounded-2xl border px-3 py-3 transition",
                      isActive
                        ? "border-[#0359A8]/20 bg-[#0359A8]/6 shadow-[0_20px_40px_-32px_rgba(3,89,168,0.5)]"
                        : "border-transparent text-neutral-600 hover:border-neutral-200 hover:bg-white hover:text-neutral-950",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition",
                        isActive
                          ? "bg-[#0359A8] text-white shadow-sm shadow-[#0359A8]/25"
                          : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-950 group-hover:text-white",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">
                          {item.label}
                        </span>
                        {isNotifications ? (
                          <NotificationBadge count={unreadCount} />
                        ) : null}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-neutral-500">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 space-y-2">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                Accesos rápidos
              </p>
              <div className="grid grid-cols-2 gap-2">
                {utilityItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 rounded-2xl border border-neutral-200/80 bg-white/80 px-3 py-3 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-950"
                  >
                    <item.icon className="h-4 w-4 text-neutral-500" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-200/80 px-4 py-4">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex w-full items-center justify-between rounded-2xl border border-neutral-200/80 bg-white px-3 py-3 text-sm font-medium text-neutral-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                {isSigningOut ? "Cerrando..." : "Cerrar sesión"}
              </span>
              <Sparkles className="h-4 w-4 opacity-60" />
            </button>
          </div>
        </div>
      </aside>

      <div className="border-b border-neutral-200/80 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#0359A8] text-white shadow-sm shadow-[#0359A8]/20">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-neutral-950">Mi cuenta</p>
              <p className="text-xs text-neutral-500">{displayName}</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-4 grid grid-cols-2 gap-2">
          {primaryItems.map((item) => {
            const isActive = item.match(pathname);
            const isNotifications = item.href === "/notifications";

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-2xl border px-3 py-3 text-sm font-medium transition",
                  isActive
                    ? "border-[#0359A8]/20 bg-[#0359A8]/6 text-[#0359A8]"
                    : "border-neutral-200/80 bg-white text-neutral-600",
                )}
              >
                <span className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
                {isNotifications ? <NotificationBadge count={unreadCount} /> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
