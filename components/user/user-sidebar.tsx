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
import { OrganizationContextSelector } from "@/components/organization/organization-context-selector";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navigationItems = [
  {
    href: "/profile",
    label: "Perfil",
    icon: UserRound,
    match: (path: string) => path === "/profile",
  },
  {
    href: "/campaign-requests",
    label: "Solicitudes",
    icon: ClipboardList,
    match: (path: string) => path.startsWith("/campaign-requests"),
  },
  {
    href: "/orders",
    label: "Ordenes",
    icon: Package,
    match: (path: string) => path.startsWith("/orders"),
  },
  {
    href: "/notifications",
    label: "Notificaciones",
    icon: Bell,
    match: (path: string) => path.startsWith("/notifications"),
  },
  {
    href: "/",
    label: "Inicio",
    icon: Home,
    match: (path: string) => path === "/",
  },
  {
    href: "/s/all",
    label: "Catalogo",
    icon: Search,
    match: (path: string) => path.startsWith("/s/"),
  },
] as const;

type UserSidebarProps = {
  user: {
    email: string;
    name?: string | null;
  };
};

type SidebarPanelProps = {
  displayName: string;
  isSigningOut: boolean;
  pathname: string;
  unreadCount: number;
  onNavigate?: () => void;
  onSignOut: () => void;
};

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="[font-family:var(--font-mkmedia)] text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
      {children}
    </p>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
  onNavigate,
  trailing,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onNavigate?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
        isActive
          ? "bg-mkmedia-blue/[0.08] text-mkmedia-blue"
          : "text-neutral-700 hover:bg-white hover:text-neutral-950",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4",
          isActive ? "text-mkmedia-blue" : "text-neutral-500",
        )}
      />
      <span className="truncate">{label}</span>
      {trailing ? <span className="ml-auto">{trailing}</span> : null}
    </Link>
  );
}

function SidebarPanel({
  displayName,
  isSigningOut,
  pathname,
  unreadCount,
  onNavigate,
  onSignOut,
}: SidebarPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,#f9f9fa_0%,#f4f5f7_100%)]">
      <header className="border-b border-neutral-200/80 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <Link href="/" onClick={onNavigate} className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-mkmedia-blue/15">
              <Image
                src="/images/logo/b-mkm-blue.png"
                alt="Logo MK MEDIA"
                width={84}
                height={42}
                className="h-auto w-8"
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-neutral-950">
                {displayName}
              </span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                Cliente workspace
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href="/notifications"
              onClick={onNavigate}
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-white hover:text-mkmedia-blue"
              aria-label="Ver notificaciones"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-mkmedia-yellow" />
              ) : null}
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              disabled={isSigningOut}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              aria-label="Cerrar sesion"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <section className="space-y-2">
          <SectionLabel>General</SectionLabel>
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const isActive = item.match(pathname);
              const isNotifications = item.href === "/notifications";

              return (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={isActive}
                  onNavigate={onNavigate}
                  trailing={
                    isNotifications ? <NotificationBadge count={unreadCount} /> : null
                  }
                />
              );
            })}
          </div>
        </section>
      </div>

      <footer className="border-t border-neutral-200/80 bg-white/78 px-3 py-3">
        <section className="space-y-2">
          <SectionLabel>Operando como</SectionLabel>
          <OrganizationContextSelector variant="footer" />
        </section>
      </footer>
    </div>
  );
}

export function UserSidebar({ user }: UserSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const { data: unreadData } = trpc.notifications.unreadCount.useQuery();
  const unreadCount = unreadData?.count ?? 0;
  const displayName = user.name?.trim() || "Usuario";

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

  function handleMobileNavigate() {
    setIsMobileDrawerOpen(false);
  }

  return (
    <>
      <aside className="hidden border-r border-neutral-200/80 bg-[#f6f7f8] lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[17.75rem] lg:flex-col">
        <SidebarPanel
          displayName={displayName}
          isSigningOut={isSigningOut}
          pathname={pathname}
          unreadCount={unreadCount}
          onSignOut={() => {
            void handleSignOut();
          }}
        />
      </aside>

      <div className="border-b border-neutral-200/80 bg-white/94 px-4 py-3 lg:hidden">
        <Sheet open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
          <div className="flex items-center justify-between gap-3">
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-mkmedia-blue/[0.08] px-3.5 text-sm font-medium text-mkmedia-blue ring-1 ring-mkmedia-blue/15 transition hover:bg-mkmedia-blue/[0.12]"
                aria-label="Abrir menu de navegacion"
              >
                <Menu className="h-4 w-4" />
                Menu
              </button>
            </SheetTrigger>

            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white ring-1 ring-mkmedia-blue/15">
                <Image
                  src="/images/logo/b-mkm-blue.png"
                  alt="Logo MK MEDIA"
                  width={72}
                  height={36}
                  className="h-auto w-7"
                />
              </span>
              <p className="[font-family:var(--font-mkmedia)] text-[10px] font-semibold uppercase tracking-[0.18em] text-mkmedia-blue">
                MK MEDIA
              </p>
            </Link>
          </div>

          <SheetContent
            side="left"
            className="w-[88%] max-w-sm gap-0 border-r border-neutral-200/80 bg-[#f6f7f8] p-0 sm:max-w-sm"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Menu de usuario</SheetTitle>
              <SheetDescription>
                Navegacion principal y selector de organizacion.
              </SheetDescription>
            </SheetHeader>

            <SidebarPanel
              displayName={displayName}
              isSigningOut={isSigningOut}
              pathname={pathname}
              unreadCount={unreadCount}
              onNavigate={handleMobileNavigate}
              onSignOut={() => {
                void handleSignOut();
              }}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
