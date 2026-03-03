import type { Metadata } from "next";
import { TaskDetailMobile } from "./_components/task-detail-mobile";

export const metadata: Metadata = {
  title: "Detalle OT | Instaladores | MK Booking",
  description: "Checklist, evidencias y ejecución de OT operativa en campo.",
};

export default async function InstallerTaskDetailPage({
  params,
}: {
  params: Promise<{ workOrderId: string }>;
}) {
  const { workOrderId } = await params;
  return <TaskDetailMobile workOrderId={workOrderId} />;
}
