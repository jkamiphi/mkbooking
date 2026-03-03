"use client";

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
import { cn } from "@/lib/utils";
import Image from "next/image";

const navItems = [
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
    label: "Órdenes",
    icon: Package,
    match: (path: string) => path.startsWith("/orders"),
  },
  {
    href: "/notifications",
    label: "Notificaciones",
    icon: Bell,
    match: (path: string) => path.startsWith("/notifications"),
  },
] as const;

const quickLinks = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/s/all", label: "Catálogo", icon: Search },
] as const;

type UserSidebarProps = {
  user: {
    email: string;
    name?: string | null;
  };
};

function getInitials(name: string | null | undefined, email: string) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return email.charAt(0).toUpperCase();
  return trimmed
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

export function UserSidebar({ user }: UserSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
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
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-200/70 bg-white/60 backdrop-blur-sm lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 pb-2 pt-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center">
              <Image
                src="/images/logo/b-mkm-blue.png"
                alt="Logo"
                width={78.4}
                height={40}
              />
            </span>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
                MKM Booking
              </p>
              <p className="text-sm font-semibold leading-tight tracking-tight text-neutral-900">
                Mi cuenta
              </p>
            </div>
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-4 px-3">
          <div className="flex gap-1">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
              >
                <link.icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Main nav */}
        <nav className="mt-4 flex-1 space-y-0.5 px-3">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
            Gestión
          </p>
          {navItems.map((item) => {
            const isActive = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-[#0359A8]/7 text-[#0359A8]"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition",
                    isActive
                      ? "bg-[#0359A8] text-white shadow-sm shadow-[#0359A8]/20"
                      : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200 group-hover:text-neutral-700",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-neutral-200/70 p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-600">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-900">
                {displayName}
              </p>
              <p className="truncate text-[11px] text-neutral-500">
                {user.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium text-neutral-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            {isSigningOut ? "Cerrando..." : "Cerrar sesión"}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="border-b border-neutral-200/70 bg-white/80 px-4 py-3 backdrop-blur-sm lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0359A8] text-white shadow-sm shadow-[#0359A8]/20">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-semibold text-neutral-900">
              Mi cuenta
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-600">
              {initials}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-red-50 hover:text-red-500"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav className="mt-3 flex gap-1">
          {navItems.map((item) => {
            const isActive = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition",
                  isActive
                    ? "bg-[#0359A8]/7 text-[#0359A8]"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
