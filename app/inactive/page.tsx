import { SignOutButton } from "@/components/auth/sign-out-button";

export const metadata = {
  title: "Cuenta inactiva - MK Booking",
  description: "Tu cuenta fue desactivada temporalmente por un administrador.",
};

export default function InactiveAccountPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl items-center px-6 py-10">
      <section className="w-full rounded-lg border border-amber-200 bg-amber-50 p-8">
        <h1 className="text-2xl font-semibold text-amber-900">Cuenta inactiva</h1>
        <p className="mt-3 text-sm text-amber-800">
          Esta cuenta fue desactivada en Gestión de Usuarios. Solicita
          reactivación a un administrador para volver a operar en el workspace.
        </p>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
