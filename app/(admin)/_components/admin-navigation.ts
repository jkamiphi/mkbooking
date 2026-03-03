import type { SystemRole } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Boxes,
  BookOpen,
  ClipboardList,
  PackageCheck,
  Palette,
  Printer,
  Wrench,
  FileText,
  Settings,
} from "lucide-react";

export interface AdminNavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  roles: SystemRole[];
}

export const adminNavigation: AdminNavigationItem[] = [
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
    name: "Solicitudes",
    href: "/admin/requests",
    icon: ClipboardList,
    roles: ["SUPERADMIN", "STAFF", "SALES"],
  },
  {
    name: "Órdenes",
    href: "/admin/orders",
    icon: PackageCheck,
    roles: ["SUPERADMIN", "STAFF", "SALES"],
  },
  {
    name: "Diseño",
    href: "/admin/design",
    icon: Palette,
    roles: ["SUPERADMIN", "STAFF", "DESIGNER"],
  },
  {
    name: "Impresión",
    href: "/admin/print",
    icon: Printer,
    roles: ["SUPERADMIN", "STAFF", "OPERATIONS_PRINT"],
  },
  {
    name: "Operativa",
    href: "/admin/operations",
    icon: Wrench,
    roles: ["SUPERADMIN", "STAFF", "SALES"],
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

export function getAdminNavigationByRole(systemRole: SystemRole) {
  return adminNavigation.filter((item) => item.roles.includes(systemRole));
}

export function getSystemRoleLabel(systemRole: SystemRole): string {
  if (systemRole === "SUPERADMIN") {
    return "Super Admin";
  }
  if (systemRole === "STAFF") {
    return "Personal";
  }
  if (systemRole === "SALES") {
    return "Ventas";
  }
  if (systemRole === "DESIGNER") {
    return "Diseño";
  }
  if (systemRole === "OPERATIONS_PRINT") {
    return "Impresión";
  }
  if (systemRole === "INSTALLER") {
    return "Instalador";
  }
  return "Cliente";
}
