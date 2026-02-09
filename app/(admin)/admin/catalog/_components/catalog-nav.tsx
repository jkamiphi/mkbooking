"use client";

import { AdminNavTabs } from "@/components/admin/nav-tabs";

const navItems = [
  { href: "/admin/catalog", label: "Resumen" },
  { href: "/admin/catalog/faces", label: "Caras" },
  { href: "/admin/catalog/pricing", label: "Precios" },
  { href: "/admin/catalog/holds", label: "Reservas" },
];

export function CatalogNav() {
  return <AdminNavTabs items={navItems} />;
}
