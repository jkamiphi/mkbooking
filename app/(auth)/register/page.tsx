import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Crear cuenta - MK Booking",
  description: "Registra una cuenta nueva para comenzar en MK Booking",
};

export default function RegisterPage() {
  return (
    <div className="w-full py-6">
      <RegisterForm />
    </div>
  );
}
