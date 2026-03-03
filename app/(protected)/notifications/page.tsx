import { NotificationsInbox } from "./notifications-inbox";

export const metadata = {
  title: "Notificaciones - MK Booking",
  description: "Bandeja in-app de actualizaciones de tus ordenes.",
};

export default function NotificationsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Notificaciones</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sigue el avance de tus ordenes en tiempo real.
        </p>
      </div>
      <NotificationsInbox />
    </div>
  );
}
