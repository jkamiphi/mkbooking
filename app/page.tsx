import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/profile");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
      <main className="text-center">
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">
          MK Booking
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-md">
          OOH Booking and Operations Management Platform
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 transition-colors"
          >
            Create Account
          </Link>
        </div>
      </main>
    </div>
  );
}
