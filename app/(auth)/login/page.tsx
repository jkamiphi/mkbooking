import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Iniciar sesión",
  description:
    "Accede a tu cuenta de Grupo MK MEDIA. Gestiona tus campañas, consulta tu historial de compras y más.",
};

export default function LoginPage() {
  return (
    <div className="w-full py-6">
      <LoginForm />
    </div>
  );
}
