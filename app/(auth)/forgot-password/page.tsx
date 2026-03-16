import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = {
  title: "Recuperar contraseña",
  description:
    "Solicita un enlace para restablecer tu contraseña. Accede a tu cuenta de Grupo MK MEDIA nuevamente.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="w-full py-6">
      <ForgotPasswordForm />
    </div>
  );
}
