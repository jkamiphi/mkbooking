import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { SystemRole } from "@prisma/client";

interface AdminHeaderProps {
  user: {
    id: string;
    email: string;
    name: string;
  };
  systemRole: SystemRole;
}

export function AdminHeader({ user }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="text-xl font-bold text-neutral-900 dark:text-white"
          >
            MK Booking
          </Link>
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 rounded">
            Admin
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/profile"
            className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            View as Customer
          </Link>
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {user.email}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
