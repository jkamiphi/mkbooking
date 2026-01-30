export const metadata = {
  title: "Taxonomía del Inventario - Admin",
  description: "Gestionar taxonomía del inventario",
};

const items = [
  { href: "/admin/inventory/taxonomy/provinces", label: "Provincias" },
  { href: "/admin/inventory/taxonomy/zones", label: "Zonas" },
  { href: "/admin/inventory/taxonomy/structure-types", label: "Tipos de Estructura" },
  { href: "/admin/inventory/taxonomy/road-types", label: "Tipos de Vía" },
  { href: "/admin/inventory/taxonomy/face-positions", label: "Posiciones de Cara" },
  { href: "/admin/inventory/taxonomy/mounting-types", label: "Tipos de Montaje" },
  { href: "/admin/inventory/taxonomy/restriction-tags", label: "Etiquetas de Restricción" },
];

export default function InventoryTaxonomyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Taxonomía
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Gestionar datos maestros del inventario.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {item.label}
            </h2>
          </a>
        ))}
      </div>
    </div>
  );
}
