import { redirect } from "next/navigation";
import { createServerTRPCCaller } from "@/lib/trpc/server";

export default async function CatalogPricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const caller = await createServerTRPCCaller();
  const profile = await caller.userProfile.current();

  if (!profile || !["SUPERADMIN", "STAFF", "SALES"].includes(profile.systemRole)) {
    redirect("/admin/orders");
  }

  return <>{children}</>;
}
