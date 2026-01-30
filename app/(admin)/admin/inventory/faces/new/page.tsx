import { NewFaceForm } from "./new-face-form";

export const metadata = {
  title: "Nueva Cara - Admin",
  description: "Crear cara de activo",
};

export default function NewFacePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Nueva Cara
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Crear una cara vendible para un activo.
        </p>
      </div>
      <NewFaceForm />
    </div>
  );
}
