import { FacesContent } from "./faces-content";

export const metadata = {
  title: "Caras de Inventario - Admin",
  description: "Gestionar caras del inventario",
};

export default function FacesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Caras
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Gestionar caras vendibles.
        </p>
      </div>
      <FacesContent />
    </div>
  );
}
