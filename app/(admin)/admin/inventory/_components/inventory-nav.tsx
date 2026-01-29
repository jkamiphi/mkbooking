"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/inventory", label: "Overview" },
  { href: "/admin/inventory/assets", label: "Assets" },
  { href: "/admin/inventory/faces", label: "Faces" },
  { href: "/admin/inventory/taxonomy", label: "Taxonomy" },
];

export function InventoryNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/admin/inventory" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium border transition-colors",
              isActive
                ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white"
                : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
