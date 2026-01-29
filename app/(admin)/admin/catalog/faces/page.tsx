import { CatalogFacesContent } from "./faces-content";

export const metadata = {
  title: "Catalog Faces - Admin",
  description: "Manage catalog faces",
};

export default function CatalogFacesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Catalog Faces
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Publish faces and manage catalog data.
        </p>
      </div>
      <CatalogFacesContent />
    </div>
  );
}
