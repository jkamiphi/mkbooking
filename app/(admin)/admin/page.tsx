import { DashboardContent } from "./dashboard-content";

export const metadata = {
  title: "Panel de Administración - MK Booking",
  description: "Panel de administración de la plataforma",
};

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Panel
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Resumen de la plataforma y estadísticas
        </p>
      </div>
      <DashboardContent />
    </div>
  );
}
