import { UserDetailContent } from "./user-detail-content";
import { AdminPageShell } from "@/components/admin/page-shell";

export const metadata = {
  title: "Detalle de Usuario - Admin",
  description: "Ver y gestionar detalles de un usuario",
};

interface UserDetailPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { userId } = await params;

  return (
    <AdminPageShell>
      <UserDetailContent userId={userId} />
    </AdminPageShell>
  );
}
