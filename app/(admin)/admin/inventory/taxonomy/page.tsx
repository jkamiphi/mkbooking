export const metadata = {
  title: "Inventory Taxonomy - Admin",
  description: "Manage inventory taxonomy",
};

const items = [
  { href: "/admin/inventory/taxonomy/provinces", label: "Provinces" },
  { href: "/admin/inventory/taxonomy/zones", label: "Zones" },
  { href: "/admin/inventory/taxonomy/structure-types", label: "Structure Types" },
  { href: "/admin/inventory/taxonomy/road-types", label: "Road Types" },
  { href: "/admin/inventory/taxonomy/face-positions", label: "Face Positions" },
  { href: "/admin/inventory/taxonomy/mounting-types", label: "Mounting Types" },
  { href: "/admin/inventory/taxonomy/restriction-tags", label: "Restriction Tags" },
];

export default function InventoryTaxonomyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Taxonomy
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Manage master data for inventory.
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
