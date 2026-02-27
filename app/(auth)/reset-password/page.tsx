import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = {
  title: "Nueva contraseña - MK Booking",
  description: "Define una nueva contraseña para tu cuenta.",
};

export default function ResetPasswordPage() {
  return (
    <div className="w-full py-6">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
