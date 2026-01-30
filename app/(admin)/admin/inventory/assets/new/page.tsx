import { NewAssetForm } from "./new-asset-form";

export const metadata = {
  title: "Nuevo Activo - Admin",
  description: "Crear activo de inventario",
};

export default function NewAssetPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Nuevo Activo
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Crear una nueva estructura de inventario.
        </p>
      </div>
      <NewAssetForm />
    </div>
  );
}
