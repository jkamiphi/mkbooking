import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = {
  title: "Recuperar contraseña - MK Booking",
  description: "Solicita un enlace para restablecer tu contraseña.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="w-full py-6">
      <ForgotPasswordForm />
    </div>
  );
}
