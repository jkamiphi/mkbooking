import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Crear cuenta nueva",
  description:
    "Registra una cuenta nueva para comenzar en Grupo MK MEDIA. Gestiona tus campañas, consulta tu historial de compras y más.",
};

export default function RegisterPage() {
  return (
    <div className="w-full py-6">
      <RegisterForm />
    </div>
  );
}
