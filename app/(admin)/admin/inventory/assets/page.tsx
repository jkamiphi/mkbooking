import { AssetsContent } from "./assets-content";

export const metadata = {
  title: "Inventory Assets - Admin",
  description: "Manage inventory assets",
};

export default function AssetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Assets
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Inventory structures and locations.
        </p>
      </div>
      <AssetsContent />
    </div>
  );
}
