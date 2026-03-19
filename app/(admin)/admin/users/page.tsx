import { redirect } from "next/navigation";

export const metadata = {
  title: "Gestión de Cuentas - Admin",
  description: "Redirección a la vista unificada de cuentas",
};

export default function UsersPage() {
  redirect("/admin/accounts");
}
