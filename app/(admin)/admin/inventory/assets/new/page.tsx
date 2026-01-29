import { NewAssetForm } from "./new-asset-form";

export const metadata = {
  title: "New Asset - Admin",
  description: "Create inventory asset",
};

export default function NewAssetPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          New Asset
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Create a new inventory structure.
        </p>
      </div>
      <NewAssetForm />
    </div>
  );
}
