export const metadata = {
  title: "Inventory - Admin",
  description: "Manage inventory assets and faces",
};

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Inventory
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Manage assets, faces, and inventory taxonomy
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          href="/admin/inventory/assets"
          className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Assets
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            View and manage structures.
          </p>
        </a>
        <a
          href="/admin/inventory/faces"
          className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Faces
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Configure sellable faces.
          </p>
        </a>
        <a
          href="/admin/inventory/taxonomy"
          className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Taxonomy
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Provinces, zones, and master data.
          </p>
        </a>
      </div>
    </div>
  );
}
