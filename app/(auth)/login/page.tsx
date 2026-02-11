import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Iniciar sesión - MK Booking",
  description: "Accede a tu cuenta de MK Booking.",
};

export default function LoginPage() {
  return (
    <div className="w-full py-6">
      <LoginForm />
    </div>
  );
}
