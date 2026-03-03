import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolvePostLoginPathByRole } from "@/lib/navigation/role-home";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect authenticated users to their role home
  if (session) {
    const profile = await db.userProfile.findUnique({
      where: { userId: session.user.id },
      select: { systemRole: true },
    });
    redirect(resolvePostLoginPathByRole(profile?.systemRole));
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
      {children}
    </div>
  );
}
