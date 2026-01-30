import { AssetsContent } from "./assets-content";

export const metadata = {
  title: "Activos de Inventario - Admin",
  description: "Gestionar activos del inventario",
};

export default function AssetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Activos
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Estructuras y ubicaciones del inventario.
        </p>
      </div>
      <AssetsContent />
    </div>
  );
}
