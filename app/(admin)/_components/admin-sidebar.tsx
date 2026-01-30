"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  Boxes,
  BookOpen,
  FileText,
  Settings,
  Shield,
} from "lucide-react";
import type { SystemRole } from "@prisma/client";

interface AdminSidebarProps {
  systemRole: SystemRole;
}

const navigation = [
  {
    name: "Panel",
    href: "/admin",
    icon: LayoutDashboard,
    roles: ["SUPERADMIN", "STAFF"],
  },
  {
    name: "Usuarios",
    href: "/admin/users",
    icon: Users,
    roles: ["SUPERADMIN", "STAFF"],
  },
  {
    name: "Organizaciones",
    href: "/admin/organizations",
    icon: Building2,
    roles: ["SUPERADMIN", "STAFF"],
  },
  {
    name: "Inventario",
    href: "/admin/inventory",
    icon: Boxes,
    roles: ["SUPERADMIN", "STAFF"],
  },
  {
    name: "Catálogo",
    href: "/admin/catalog",
    icon: BookOpen,
    roles: ["SUPERADMIN", "STAFF"],
  },
  {
    name: "Registros de Auditoría",
    href: "/admin/audit-logs",
    icon: FileText,
    roles: ["SUPERADMIN"],
  },
  {
    name: "Configuración",
    href: "/admin/settings",
    icon: Settings,
    roles: ["SUPERADMIN"],
  },
];

export function AdminSidebar({ systemRole }: AdminSidebarProps) {
  const pathname = usePathname();

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(systemRole)
  );

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-neutral-200 dark:lg:border-neutral-800 lg:bg-white dark:lg:bg-neutral-900 lg:min-h-[calc(100vh-4rem)]">
      <nav className="flex flex-1 flex-col p-4 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Role Badge */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 p-4">
        <div className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-blue-600" />
          <span className="text-neutral-600 dark:text-neutral-400">
            {systemRole === "SUPERADMIN" ? "Super Admin" : "Personal"}
          </span>
        </div>
      </div>
    </aside>
  );
}
