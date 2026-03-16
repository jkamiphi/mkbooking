"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  ChevronDown,
  ClipboardList,
  ClipboardPlus,
  Home,
  LogOut,
  Package,
  Search,
  UserRound,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { OrganizationContextSelector } from "@/components/organization/organization-context-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserHeaderActionsProps = {
  user: {
    email: string;
    name?: string | null;
  };
};

function getUserInitials(name: string | null | undefined, email: string) {
  const trimmedName = (name ?? "").trim();
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

export function UserHeaderActions({ user }: UserHeaderActionsProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const userInitials = getUserInitials(user.name, user.email);
  const { data: unreadData } = trpc.notifications.unreadCount.useQuery();
  const unreadCount = unreadData?.count ?? 0;

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Sign out error:", error);
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <OrganizationContextSelector />
      <Button
        asChild
        variant="ghost"
        size="icon-lg"
        className="relative rounded-md border border-neutral-200 bg-white/85 text-neutral-600 shadow-sm hover:bg-white hover:text-neutral-900"
      >
        <Link href="/notifications" aria-label="Abrir notificaciones">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-md bg-[#fcb814] px-1 text-[10px] font-semibold text-neutral-900">
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
            className="h-10 rounded-md border border-neutral-200 bg-white/85 px-1.5 pr-2 shadow-sm hover:bg-white"
            aria-label="Abrir menú de usuario"
          >
            <Avatar className="h-7 w-7 border border-neutral-200">
              <AvatarFallback className="bg-neutral-100 text-[11px] font-semibold text-neutral-700">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="h-4 w-4 text-neutral-500" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-64 border-neutral-200 bg-white"
        >
          <DropdownMenuLabel className="pb-1">
            <p className="text-sm font-semibold text-neutral-900">
              {user.name?.trim() || "Mi cuenta"}
            </p>
            <p className="text-xs font-normal text-neutral-500">{user.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/" className="cursor-pointer">
              <Home className="h-4 w-4" />
              Inicio
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/s/all" className="cursor-pointer">
              <Search className="h-4 w-4" />
              Buscar espacios
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/campaign-requests/new" className="cursor-pointer">
              <ClipboardPlus className="h-4 w-4" />
              Nueva solicitud
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/campaign-requests" className="cursor-pointer">
              <ClipboardList className="h-4 w-4" />
              Mis solicitudes
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/orders" className="cursor-pointer">
              <Package className="h-4 w-4" />
              Mis órdenes
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/notifications" className="cursor-pointer">
              <Bell className="h-4 w-4" />
              Notificaciones
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <UserRound className="h-4 w-4" />
              Mi perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(event) => {
              event.preventDefault();
              if (!isSigningOut) {
                void handleSignOut();
              }
            }}
            className="cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            {isSigningOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
