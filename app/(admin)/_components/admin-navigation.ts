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

export interface AdminNavigationLeaf {
  type: "item";
  key: string;
  name: string;
  href: string;
  icon?: LucideIcon;
  roles: SystemRole[];
}

export interface AdminNavigationGroup {
  type: "group";
  key: string;
  name: string;
  icon?: LucideIcon;
  children: AdminNavigationLeaf[];
}

export type AdminNavigationNode = AdminNavigationLeaf | AdminNavigationGroup;

const ADMIN_ROLES: SystemRole[] = ["SUPERADMIN", "STAFF"];
const SALES_ROLES: SystemRole[] = ["SUPERADMIN", "STAFF", "SALES"];
const DESIGN_ROLES: SystemRole[] = ["SUPERADMIN", "STAFF", "DESIGNER"];
const PRINT_ROLES: SystemRole[] = ["SUPERADMIN", "STAFF", "OPERATIONS_PRINT"];

const adminNavigationTree: AdminNavigationNode[] = [
  {
    type: "item",
    key: "panel",
    name: "Panel",
    href: "/admin",
    icon: LayoutDashboard,
    roles: ADMIN_ROLES,
  },
  {
    type: "group",
    key: "accounts",
    name: "Gestión de cuentas",
    icon: Users,
    children: [
      {
        type: "item",
        key: "users",
        name: "Usuarios",
        href: "/admin/users",
        icon: Users,
        roles: ADMIN_ROLES,
      },
      {
        type: "item",
        key: "organizations",
        name: "Organizaciones",
        href: "/admin/organizations",
        icon: Building2,
        roles: ADMIN_ROLES,
      },
    ],
  },
  {
    type: "group",
    key: "inventory",
    name: "Inventario",
    icon: Boxes,
    children: [
      {
        type: "item",
        key: "inventory-overview",
        name: "Resumen",
        href: "/admin/inventory",
        icon: Boxes,
        roles: ADMIN_ROLES,
      },
      {
        type: "item",
        key: "inventory-assets",
        name: "Activos",
        href: "/admin/inventory/assets",
        icon: Boxes,
        roles: ADMIN_ROLES,
      },
      {
        type: "item",
        key: "inventory-faces",
        name: "Caras",
        href: "/admin/inventory/faces",
        icon: Boxes,
        roles: ADMIN_ROLES,
      },
      {
        type: "item",
        key: "inventory-taxonomy",
        name: "Taxonomía",
        href: "/admin/inventory/taxonomy",
        icon: Boxes,
        roles: ADMIN_ROLES,
      },
    ],
  },
  {
    type: "group",
    key: "catalog",
    name: "Catálogo",
    icon: BookOpen,
    children: [
      {
        type: "item",
        key: "catalog-overview",
        name: "Resumen",
        href: "/admin/catalog",
        icon: BookOpen,
        roles: ADMIN_ROLES,
      },
      {
        type: "item",
        key: "catalog-faces",
        name: "Caras",
        href: "/admin/catalog/faces",
        icon: BookOpen,
        roles: ADMIN_ROLES,
      },
      {
        type: "item",
        key: "catalog-services",
        name: "Servicios",
        href: "/admin/catalog/services",
        icon: BookOpen,
        roles: ADMIN_ROLES,
      },
      {
        type: "item",
        key: "catalog-pricing",
        name: "Precios",
        href: "/admin/catalog/pricing",
        icon: BookOpen,
        roles: ADMIN_ROLES,
      },
      {
        type: "item",
        key: "catalog-holds",
        name: "Reservas",
        href: "/admin/catalog/holds",
        icon: BookOpen,
        roles: ADMIN_ROLES,
      },
    ],
  },
  {
    type: "group",
    key: "operations",
    name: "Operaciones",
    icon: Wrench,
    children: [
      {
        type: "item",
        key: "requests",
        name: "Solicitudes",
        href: "/admin/requests",
        icon: ClipboardList,
        roles: SALES_ROLES,
      },
      {
        type: "item",
        key: "orders",
        name: "Órdenes",
        href: "/admin/orders",
        icon: PackageCheck,
        roles: SALES_ROLES,
      },
      {
        type: "item",
        key: "design",
        name: "Diseño",
        href: "/admin/design",
        icon: Palette,
        roles: DESIGN_ROLES,
      },
      {
        type: "item",
        key: "print",
        name: "Impresión",
        href: "/admin/print",
        icon: Printer,
        roles: PRINT_ROLES,
      },
      {
        type: "item",
        key: "operations-workorders",
        name: "Operativa",
        href: "/admin/operations",
        icon: Wrench,
        roles: SALES_ROLES,
      },
    ],
  },
  {
    type: "item",
    key: "audit-logs",
    name: "Registro de auditoría",
    href: "/admin/audit-logs",
    icon: FileText,
    roles: ["SUPERADMIN"],
  },
  {
    type: "item",
    key: "settings",
    name: "Configuración",
    href: "/admin/settings",
    icon: Settings,
    roles: ["SUPERADMIN"],
  },
];

export function isAdminNavigationGroup(
  node: AdminNavigationNode
): node is AdminNavigationGroup {
  return node.type === "group";
}

export function isAdminNavigationHrefActive(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(href));
}

export function getActiveAdminNavigationHref(
  pathname: string,
  hrefs: string[]
): string | null {
  const matches = hrefs.filter((href) =>
    isAdminNavigationHrefActive(pathname, href)
  );
  if (matches.length === 0) {
    return null;
  }
  matches.sort((a, b) => b.length - a.length);
  return matches[0] ?? null;
}

export function getAdminNavigationGroupActiveChildHref(
  pathname: string,
  group: AdminNavigationGroup
): string | null {
  return getActiveAdminNavigationHref(
    pathname,
    group.children.map((child) => child.href)
  );
}

export function getAdminNavigationDefaultExpandedGroups(
  navigation: AdminNavigationNode[],
  pathname: string
): Record<string, boolean> {
  const expanded: Record<string, boolean> = {};
  for (const node of navigation) {
    if (!isAdminNavigationGroup(node)) {
      continue;
    }
    expanded[node.key] =
      getAdminNavigationGroupActiveChildHref(pathname, node) !== null;
  }
  return expanded;
}

export function getAdminNavigationByRole(
  systemRole: SystemRole
): AdminNavigationNode[] {
  const filteredNavigation: AdminNavigationNode[] = [];

  for (const node of adminNavigationTree) {
    if (isAdminNavigationGroup(node)) {
      const children = node.children.filter((child) =>
        child.roles.includes(systemRole)
      );
      if (children.length > 0) {
        filteredNavigation.push({
          ...node,
          children,
        });
      }
      continue;
    }

    if (node.roles.includes(systemRole)) {
      filteredNavigation.push(node);
    }
  }

  return filteredNavigation;
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
