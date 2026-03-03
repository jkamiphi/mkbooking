import type { Metadata } from "next";
import { TaskListMobile } from "./_components/task-list-mobile";

export const metadata: Metadata = {
  title: "Tareas | Instaladores | MK Booking",
  description: "Bandeja móvil de órdenes operativas asignadas al instalador.",
};

export default function InstallerTasksPage() {
  return <TaskListMobile />;
}
