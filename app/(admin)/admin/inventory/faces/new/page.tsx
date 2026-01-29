import { NewFaceForm } from "./new-face-form";

export const metadata = {
  title: "New Face - Admin",
  description: "Create asset face",
};

export default function NewFacePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          New Face
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Create a sellable face for an asset.
        </p>
      </div>
      <NewFaceForm />
    </div>
  );
}
