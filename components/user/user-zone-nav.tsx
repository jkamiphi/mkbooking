"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Package, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/profile",
    label: "Perfil",
    icon: UserRound,
  },
  {
    href: "/campaign-requests",
    label: "Solicitudes",
    icon: ClipboardList,
  },
  {
    href: "/orders",
    label: "Órdenes",
    icon: Package,
  },
] as const;

export function UserZoneNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-200 bg-white/85 p-2 shadow-sm backdrop-blur">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/profile" && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-[#0359A8] text-white shadow-lg shadow-[#0359A8]/25"
                  : "text-neutral-700 hover:bg-neutral-100"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
