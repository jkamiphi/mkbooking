export const metadata = {
  title: "Inventario - Admin",
  description: "Gestionar activos y caras del inventario",
};

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Inventario
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Gestionar activos, caras y taxonomía del inventario
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          href="/admin/inventory/assets"
          className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Activos
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Ver y gestionar estructuras.
          </p>
        </a>
        <a
          href="/admin/inventory/faces"
          className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Caras
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Configurar caras vendibles.
          </p>
        </a>
        <a
          href="/admin/inventory/taxonomy"
          className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Taxonomía
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Provincias, zonas y datos maestros.
          </p>
        </a>
      </div>
    </div>
  );
}
