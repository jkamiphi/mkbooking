"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, Menu, Shield, X } from "lucide-react";
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
import { trpc } from "@/lib/trpc/client";
import type { SystemRole } from "@prisma/client";
import {
  getAdminNavigationDefaultExpandedGroups,
  getAdminNavigationByRole,
  getAdminNavigationGroupActiveChildHref,
  getSystemRoleLabel,
  isAdminNavigationGroup,
  isAdminNavigationHrefActive,
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
    [systemRole],
  );
  const userInitials = useMemo(
    () => getUserInitials(user.name, user.email),
    [user.email, user.name],
  );
  const roleLabel = useMemo(() => getSystemRoleLabel(systemRole), [systemRole]);
  const { data: unreadData } = trpc.notifications.unreadCount.useQuery();
  const unreadCount = unreadData?.count ?? 0;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const defaultExpandedGroups = useMemo(
    () => getAdminNavigationDefaultExpandedGroups(navigation, pathname),
    [navigation, pathname],
  );
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
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

  function isGroupExpanded(groupKey: string) {
    return expandedGroups[groupKey] ?? defaultExpandedGroups[groupKey] ?? false;
  }

  function toggleGroup(groupKey: string) {
    const currentValue = isGroupExpanded(groupKey);
    setExpandedGroups((previousState) => ({
      ...previousState,
      [groupKey]: !currentValue,
    }));
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-mkmedia-blue/15 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMobileMenuOpen(true)}
              className="border-mkmedia-blue/20 text-mkmedia-blue hover:border-mkmedia-blue/40 hover:bg-mkmedia-blue/5 hover:text-mkmedia-blue dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800 lg:hidden"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="h-4 w-4" />
            </Button>

            <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
              <div className="relative h-8 w-[4.75rem] shrink-0">
                <Image
                  src="/images/logo/b-mkm-blue.png"
                  alt="Logo MK MEDIA"
                  fill
                  sizes="76px"
                  className="object-contain dark:hidden"
                />
                <Image
                  src="/images/logo/b-mkm-white.png"
                  alt="Logo MK MEDIA"
                  fill
                  sizes="76px"
                  className="hidden object-contain dark:block"
                />
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="[font-family:var(--font-mkmedia)] text-xs font-semibold tracking-[0.16em] text-mkmedia-blue dark:text-white">
                  MK MEDIA
                </p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
                  Plataforma Admin
                </p>
              </div>
            </Link>

            <span className="hidden md:inline-flex items-center rounded-md border border-mkmedia-blue/20 bg-mkmedia-blue/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-mkmedia-blue dark:border-mkmedia-blue/30 dark:bg-mkmedia-blue/20 dark:text-mkmedia-yellow">
              Admin
            </span>

            <div className="hidden lg:inline-flex items-center gap-1.5 rounded-md border border-mkmedia-blue/15 bg-mkmedia-blue/6 px-3 py-1 text-xs text-mkmedia-blue dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
              <Shield className="h-3.5 w-3.5" />
              <span className="[font-family:var(--font-mkmedia)]">
                {roleLabel}
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2.5">
            <Button
              asChild
              variant="ghost"
              size="icon-sm"
              className="relative rounded-md border border-mkmedia-blue/15 bg-white text-mkmedia-blue shadow-sm hover:border-mkmedia-blue/30 hover:bg-mkmedia-blue/5 hover:text-mkmedia-blue dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
              aria-label="Notificaciones"
            >
              <Link href="/notifications" aria-label="Abrir notificaciones">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-md bg-mkmedia-yellow px-1 text-[10px] font-semibold text-neutral-900">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 rounded-md border border-mkmedia-blue/15 bg-white px-1.5 pr-2 shadow-sm hover:border-mkmedia-blue/30 hover:bg-mkmedia-blue/5 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                  aria-label="Abrir menú de usuario"
                >
                  <Avatar className="h-7 w-7 border border-mkmedia-blue/15 dark:border-neutral-700">
                    <AvatarFallback className="bg-mkmedia-blue/8 text-[11px] font-semibold text-mkmedia-blue dark:bg-neutral-800 dark:text-neutral-200">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                    Cuenta
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 border-mkmedia-blue/20 bg-white dark:border-neutral-800 dark:bg-neutral-900"
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
                  <div className="inline-flex items-center gap-2 rounded-md border border-mkmedia-blue/20 bg-mkmedia-blue/6 px-2 py-1 text-xs text-mkmedia-blue dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                    <Shield className="h-3.5 w-3.5" />
                    <span className="[font-family:var(--font-mkmedia)]">
                      {roleLabel}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/notifications">Notificaciones</Link>
                </DropdownMenuItem>
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

          <aside className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col border-r border-mkmedia-blue/20 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
            <div className="border-b border-mkmedia-blue/20 px-4 py-4 dark:border-neutral-800">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2">
                  <div className="relative h-8 w-[4.75rem]">
                    <Image
                      src="/images/logo/b-mkm-blue.png"
                      alt="Logo MK MEDIA"
                      fill
                      sizes="76px"
                      className="object-contain dark:hidden"
                    />
                    <Image
                      src="/images/logo/b-mkm-white.png"
                      alt="Logo MK MEDIA"
                      fill
                      sizes="76px"
                      className="hidden object-contain dark:block"
                    />
                  </div>
                  <p className="[font-family:var(--font-mkmedia)] text-xs font-semibold tracking-[0.14em] text-mkmedia-blue dark:text-white">
                    MK MEDIA
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {user.email}
                  </p>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-mkmedia-blue/20 bg-mkmedia-blue/6 px-3 py-1.5 text-xs text-mkmedia-blue dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                    <Shield className="h-3.5 w-3.5" />
                    <span className="[font-family:var(--font-mkmedia)]">
                      {roleLabel}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeMobileMenu}
                  aria-label="Cerrar menú"
                  className="border-mkmedia-blue/25 text-mkmedia-blue hover:bg-mkmedia-blue/5 hover:text-mkmedia-blue dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {navigation.map((node) => {
                if (!isAdminNavigationGroup(node)) {
                  const isActive = isAdminNavigationHrefActive(
                    pathname,
                    node.href,
                  );

                  return (
                    <Link
                      key={node.key}
                      href={node.href}
                      onClick={closeMobileMenu}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-mkmedia-blue/8 text-mkmedia-blue dark:bg-mkmedia-blue/20 dark:text-mkmedia-yellow"
                          : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {node.icon ? <node.icon className="h-4 w-4" /> : null}
                      {node.name}
                    </Link>
                  );
                }

                const activeChildHref = getAdminNavigationGroupActiveChildHref(
                  pathname,
                  node,
                );
                const isGroupActive = activeChildHref !== null;
                const isExpanded = isGroupExpanded(node.key);

                return (
                  <div key={node.key} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleGroup(node.key)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        isGroupActive
                          ? "bg-mkmedia-blue/8 text-mkmedia-blue dark:bg-mkmedia-blue/20 dark:text-mkmedia-yellow"
                          : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
                      )}
                      aria-expanded={isExpanded}
                      aria-controls={`mobile-admin-nav-group-${node.key}`}
                    >
                      {node.icon ? <node.icon className="h-4 w-4" /> : null}
                      <span className="truncate">{node.name}</span>
                      <ChevronDown
                        className={cn(
                          "ml-auto h-4 w-4 transition-transform",
                          isExpanded ? "rotate-180" : "",
                        )}
                      />
                    </button>

                    {isExpanded ? (
                      <div
                        id={`mobile-admin-nav-group-${node.key}`}
                        className="ml-7 space-y-1 border-l border-neutral-200 pl-3 dark:border-neutral-800"
                      >
                        {node.children.map((child) => {
                          const isChildActive = activeChildHref === child.href;

                          return (
                            <Link
                              key={child.key}
                              href={child.href}
                              onClick={closeMobileMenu}
                              className={cn(
                                "flex items-center rounded-lg px-2 py-2 text-sm transition-colors",
                                isChildActive
                                  ? "bg-mkmedia-blue/8 text-mkmedia-blue dark:bg-mkmedia-blue/20 dark:text-mkmedia-yellow"
                                  : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
                              )}
                              aria-current={isChildActive ? "page" : undefined}
                            >
                              {child.name}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </nav>

            <div className="space-y-3 border-t border-mkmedia-blue/20 p-4 dark:border-neutral-800">
              <Link
                href="/notifications"
                onClick={closeMobileMenu}
                className="flex items-center justify-between rounded-lg border border-mkmedia-blue/20 bg-mkmedia-blue/6 px-3 py-2 text-sm font-medium text-mkmedia-blue dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              >
                <span className="inline-flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notificaciones
                </span>
                {unreadCount > 0 ? (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-md bg-mkmedia-yellow px-1.5 py-0.5 text-[10px] font-semibold text-neutral-900">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </Link>

              <div className="flex items-center justify-between gap-2">
                <Link
                  href="/profile"
                  onClick={closeMobileMenu}
                  className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                >
                  Ver como cliente
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!signingOut) {
                      void handleSignOut();
                    }
                  }}
                  className="border-neutral-300 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  {signingOut ? "Cerrando..." : "Cerrar sesión"}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
