import { UsersContent } from "./users-content";

export const metadata = {
  title: "User Management - Admin",
  description: "Manage platform users",
};

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          User Management
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          View and manage all platform users
        </p>
      </div>
      <UsersContent />
    </div>
  );
}
