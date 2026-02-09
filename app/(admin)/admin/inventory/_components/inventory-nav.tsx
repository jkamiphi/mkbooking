"use client";

import { AdminNavTabs } from "@/components/admin/nav-tabs";

const navItems = [
  { href: "/admin/inventory", label: "Resumen" },
  { href: "/admin/inventory/assets", label: "Activos" },
  { href: "/admin/inventory/faces", label: "Caras" },
  { href: "/admin/inventory/taxonomy", label: "Taxonomía" },
];

export function InventoryNav() {
  return <AdminNavTabs items={navItems} />;
}
