import { UsersContent } from "./users-content";

export const metadata = {
  title: "Gestión de Usuarios - Admin",
  description: "Gestionar usuarios de la plataforma",
};

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Gestión de Usuarios
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Ver y gestionar todos los usuarios de la plataforma
        </p>
      </div>
      <UsersContent />
    </div>
  );
}
