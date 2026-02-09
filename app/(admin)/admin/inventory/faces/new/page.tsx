import { NewFaceForm } from "./new-face-form";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";

export const metadata = {
  title: "Nueva Cara - Admin",
  description: "Crear cara de activo",
};

export default function NewFacePage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Nueva cara"
        description="Crear una nueva cara vendible para un activo."
      />
      <NewFaceForm />
    </AdminPageShell>
  );
}
