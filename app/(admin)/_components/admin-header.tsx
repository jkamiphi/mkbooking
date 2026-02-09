"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Shield, X } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth-client";
import type { SystemRole } from "@prisma/client";
import {
  getAdminNavigationByRole,
  getSystemRoleLabel,
} from "./admin-navigation";

interface AdminHeaderProps {
  user: {
    id: string;
    email: string;
    name: string;
  };
  systemRole: SystemRole;
}

function getUserInitials(name: string, email: string) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return email.charAt(0).toUpperCase();
  }
  const initials = trimmedName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return initials || email.charAt(0).toUpperCase();
}

export function AdminHeader({ user, systemRole }: AdminHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const navigation = useMemo(
    () => getAdminNavigationByRole(systemRole),
    [systemRole]
  );
  const userInitials = useMemo(
    () => getUserInitials(user.name, user.email),
    [user.email, user.name]
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setSigningOut(false);
    }
  }

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-neutral-200/90 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/80 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="h-4 w-4" />
            </Button>

            <Link href="/admin" className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white tracking-tight">
                MK Booking
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-xs font-medium rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                Admin
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              aria-label="Notificaciones"
            >
              <Bell className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full p-0 hover:bg-transparent"
                  aria-label="Abrir menú de usuario"
                >
                  <Avatar className="h-8 w-8 border border-neutral-200 dark:border-neutral-700">
                    <AvatarFallback className="bg-neutral-100 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 border-neutral-200 dark:border-neutral-800"
              >
                <DropdownMenuLabel className="pb-1">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {user.name}
                  </p>
                  <p className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
                    {user.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuLabel className="pt-0">
                  <div className="inline-flex items-center gap-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 text-xs text-neutral-700 dark:text-neutral-300">
                    <Shield className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    {getSystemRoleLabel(systemRole)}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">Ver como cliente</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    if (!signingOut) {
                      void handleSignOut();
                    }
                  }}
                  className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                >
                  {signingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            onClick={closeMobileMenu}
            aria-label="Cerrar menú de navegación"
          />

          <aside className="absolute inset-y-0 left-0 w-[88%] max-w-sm bg-white dark:bg-neutral-900 shadow-2xl border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <div>
                <p className="text-base font-semibold text-neutral-900 dark:text-white">
                  Panel Admin
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {user.email}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeMobileMenu}
                aria-label="Cerrar menú"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {navigation.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                        : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                <Shield className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                {getSystemRoleLabel(systemRole)}
              </div>
              <div className="flex items-center justify-between gap-2">
                <Link
                  href="/profile"
                  onClick={closeMobileMenu}
                  className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                >
                  Ver como cliente
                </Link>
                <SignOutButton />
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
