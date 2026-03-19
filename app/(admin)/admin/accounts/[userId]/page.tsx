import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { AccountDetailContent } from "./account-detail-content";

interface AccountDetailPageProps {
  params: Promise<{ userId: string }>;
}

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
  const { userId } = await params;

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Detalle de cuenta"
        description="Administra tipo de cuenta, membresías organizacionales y permisos de acceso."
      />
      <AccountDetailContent userId={userId} />
    </AdminPageShell>
  );
}
