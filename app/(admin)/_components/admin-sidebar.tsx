"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Shield } from "lucide-react";
import type { SystemRole } from "@prisma/client";
import {
  getAdminNavigationByRole,
  getSystemRoleLabel,
} from "./admin-navigation";

interface AdminSidebarProps {
  systemRole: SystemRole;
}

export function AdminSidebar({ systemRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const navigation = getAdminNavigationByRole(systemRole);

  return (
    <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:border-r lg:border-neutral-200/90 dark:lg:border-neutral-800 lg:bg-white/90 dark:lg:bg-neutral-900/70 lg:backdrop-blur">
      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-5 space-y-1.5">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-neutral-500 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Role Badge */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 p-4">
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900">
          <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-neutral-700 dark:text-neutral-300">
            {getSystemRoleLabel(systemRole)}
          </span>
        </div>
      </div>
    </aside>
  );
}
