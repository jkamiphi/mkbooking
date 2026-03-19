import { redirect } from "next/navigation";

export const metadata = {
  title: "Detalle de Cuenta - Admin",
  description: "Redirección al detalle unificado de cuenta",
};

interface UserDetailPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { userId } = await params;

  redirect(`/admin/accounts/${userId}`);
}
