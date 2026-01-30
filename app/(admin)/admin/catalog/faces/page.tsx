import { CatalogFacesContent } from "./faces-content";

export const metadata = {
  title: "Caras del Catálogo - Admin",
  description: "Gestionar caras del catálogo",
};

export default function CatalogFacesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Caras del Catálogo
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Publicar caras y gestionar datos del catálogo.
        </p>
      </div>
      <CatalogFacesContent />
    </div>
  );
}
