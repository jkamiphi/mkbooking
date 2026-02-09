import { EditFaceForm } from "./edit-face-form";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";

export const metadata = {
  title: "Editar Cara - Admin",
  description: "Actualizar cara de activo",
};

interface EditFacePageProps {
  params: Promise<{
    faceId: string;
  }>;
}

export default async function EditFacePage({ params }: EditFacePageProps) {
  const { faceId } = await params;

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Editar cara"
        description="Actualiza dimensiones, orientación y estado comercial de la cara."
      />
      <EditFaceForm faceId={faceId} />
    </AdminPageShell>
  );
}
