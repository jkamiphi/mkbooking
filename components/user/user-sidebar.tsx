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
  Menu,
  Package,
  Search,
  UserRound,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-mkmedia-yellow px-1.5 py-0.5 text-[10px] font-semibold text-neutral-900">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function UserSidebar({ user }: UserSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const { data: unreadData } = trpc.notifications.unreadCount.useQuery();
  const unreadCount = unreadData?.count ?? 0;
  const initials = getInitials(user.name, user.email);
  const displayName = user.name?.trim() || "Usuario";

  function isUtilityItemActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    if (href === "/s/all") {
      return pathname.startsWith("/s/");
    }

    return pathname === href;
  }

  async function handleSignOut() {
    setIsMobileDrawerOpen(false);
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
      <aside className="hidden border-r border-neutral-200/80 bg-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[17.5rem] lg:flex-col">
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-neutral-200/80 px-5 py-6">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md border border-mkmedia-blue/20 bg-mkmedia-blue/8">
                <Image
                  src="/images/logo/b-mkm-blue.png"
                  alt="Logo MK MEDIA"
                  width={88}
                  height={44}
                  className="h-auto w-9"
                />
              </span>
              <p className="[font-family:var(--font-mkmedia)] text-[11px] font-semibold uppercase tracking-[0.18em] text-mkmedia-blue">
                MK MEDIA
              </p>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="space-y-2">
              <p className="[font-family:var(--font-mkmedia)] px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
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
                      "group flex items-start gap-3 rounded-lg border px-3 py-3 transition-colors",
                      isActive
                        ? "border-mkmedia-blue/30 bg-mkmedia-blue/8 text-mkmedia-blue"
                        : "border-transparent text-neutral-600 hover:border-neutral-200 hover:bg-white hover:text-neutral-950",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors",
                        isActive
                          ? "border-mkmedia-blue/30 bg-mkmedia-blue text-white"
                          : "border-neutral-200 bg-neutral-50 text-neutral-500 group-hover:border-mkmedia-blue/20 group-hover:text-mkmedia-blue",
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
                      <span
                        className={cn(
                          "mt-1 block text-xs leading-5",
                          isActive ? "text-mkmedia-blue/80" : "text-neutral-500",
                        )}
                      >
                        {item.description}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 space-y-2">
              <p className="[font-family:var(--font-mkmedia)] px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                Accesos rápidos
              </p>
              <div className="space-y-1">
                {utilityItems.map((item) => {
                  const isActive = isUtilityItemActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "text-mkmedia-blue"
                          : "text-neutral-600 hover:text-mkmedia-blue",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4",
                          isActive ? "text-mkmedia-blue" : "text-neutral-500",
                        )}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-neutral-200/80 px-4 py-4">
            <div className="rounded-lg border border-neutral-200/80 bg-neutral-50/60 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-mkmedia-blue/20 bg-mkmedia-blue/8 text-sm font-semibold text-mkmedia-blue">
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
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200/80 bg-white px-3 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {isSigningOut ? "Cerrando..." : "Cerrar sesión"}
            </button>
          </div>
        </div>
      </aside>

      <div className="border-b border-neutral-200/80 bg-white/95 px-4 py-3 lg:hidden">
        <Sheet open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
          <div className="flex items-center justify-between gap-3">
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-mkmedia-blue/20 bg-mkmedia-blue/8 px-3 text-xs font-semibold text-mkmedia-blue transition-colors hover:border-mkmedia-blue/35 hover:bg-mkmedia-blue/12"
                aria-label="Abrir menú de navegación"
              >
                <Menu className="h-4 w-4" />
                Menú
              </button>
            </SheetTrigger>

            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-md border border-mkmedia-blue/20 bg-mkmedia-blue/8">
                <Image
                  src="/images/logo/b-mkm-blue.png"
                  alt="Logo MK MEDIA"
                  width={72}
                  height={36}
                  className="h-auto w-7"
                />
              </span>
              <p className="[font-family:var(--font-mkmedia)] text-[11px] font-semibold uppercase tracking-[0.16em] text-mkmedia-blue">
                MK MEDIA
              </p>
            </Link>
          </div>

          <SheetContent
            side="left"
            className="w-[88%] max-w-sm gap-0 border-r border-neutral-200/80 bg-white p-0 sm:max-w-sm"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Menú de usuario</SheetTitle>
              <SheetDescription>
                Navegación principal y accesos rápidos del panel de usuario.
              </SheetDescription>
            </SheetHeader>

            <div className="border-b border-neutral-200/80 px-4 py-4">
              <Link
                href="/"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex items-center gap-2.5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-mkmedia-blue/20 bg-mkmedia-blue/8">
                  <Image
                    src="/images/logo/b-mkm-blue.png"
                    alt="Logo MK MEDIA"
                    width={72}
                    height={36}
                    className="h-auto w-7"
                  />
                </span>
                <p className="[font-family:var(--font-mkmedia)] text-[11px] font-semibold uppercase tracking-[0.16em] text-mkmedia-blue">
                  MK MEDIA
                </p>
              </Link>

              <div className="mt-4 rounded-lg border border-neutral-200/80 bg-neutral-50/60 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-mkmedia-blue/20 bg-mkmedia-blue/8 text-sm font-semibold text-mkmedia-blue">
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

            <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
              <div className="space-y-2">
                <p className="[font-family:var(--font-mkmedia)] px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Workspace
                </p>
                {primaryItems.map((item) => {
                  const isActive = item.match(pathname);
                  const isNotifications = item.href === "/notifications";

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileDrawerOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group flex items-start gap-3 rounded-lg border px-3 py-3 transition-colors",
                        isActive
                          ? "border-mkmedia-blue/30 bg-mkmedia-blue/8 text-mkmedia-blue"
                          : "border-transparent text-neutral-600 hover:border-neutral-200 hover:bg-white hover:text-neutral-950",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors",
                          isActive
                            ? "border-mkmedia-blue/30 bg-mkmedia-blue text-white"
                            : "border-neutral-200 bg-neutral-50 text-neutral-500 group-hover:border-mkmedia-blue/20 group-hover:text-mkmedia-blue",
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
                        <span
                          className={cn(
                            "mt-1 block text-xs leading-5",
                            isActive ? "text-mkmedia-blue/80" : "text-neutral-500",
                          )}
                        >
                          {item.description}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div className="space-y-2">
                <p className="[font-family:var(--font-mkmedia)] px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Accesos rápidos
                </p>
                <div className="space-y-1">
                  {utilityItems.map((item) => {
                    const isActive = isUtilityItemActive(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileDrawerOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "text-mkmedia-blue"
                            : "text-neutral-600 hover:text-mkmedia-blue",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4",
                            isActive ? "text-mkmedia-blue" : "text-neutral-500",
                          )}
                        />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-200/80 p-4">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200/80 bg-white px-3 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {isSigningOut ? "Cerrando..." : "Cerrar sesión"}
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
