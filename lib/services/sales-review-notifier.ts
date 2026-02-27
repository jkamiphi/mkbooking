import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import type { SalesReviewEventType } from "@prisma/client";

function formatEventLabel(eventType: SalesReviewEventType) {
  switch (eventType) {
    case "CRITICAL_CHANGE":
      return "Cambio crítico";
    case "REVIEW_REQUIRED":
      return "Revisión requerida";
    case "ORDER_CONFIRMED_WITHOUT_SALES_APPROVAL":
      return "Orden confirmada sin aprobación comercial";
    case "DOCUMENT_APPROVED":
      return "Documento aprobado";
    case "DOCUMENT_CHANGES_REQUESTED":
      return "Documento requiere cambios";
    case "ORDER_APPROVED":
      return "Revisión comercial aprobada";
    case "ORDER_CHANGES_REQUESTED":
      return "Revisión comercial requiere cambios";
    default:
      return eventType;
  }
}

function formatTimestamp(date: Date) {
  return date.toLocaleString("es-PA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function notifySalesReviewRequired(input: {
  orderId: string;
  orderCode: string;
  eventType: SalesReviewEventType;
  actorName: string;
  reason: string;
  notes?: string | null;
}) {
  const recipients = await db.userProfile.findMany({
    where: {
      systemRole: "SALES",
      isActive: true,
      emailNotifications: true,
      user: {
        email: {
          not: "",
        },
      },
    },
    select: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (recipients.length === 0) {
    return;
  }

  const now = new Date();
  const eventLabel = formatEventLabel(input.eventType);
  const orderPath = `/admin/orders/${input.orderId}`;
  const notesBlock = input.notes?.trim()
    ? `\nNotas:\n${input.notes.trim()}\n`
    : "";

  const subject = `[MK Booking] Revisión comercial: ${input.orderCode}`;
  const text = [
    `Se requiere atención comercial para la orden ${input.orderCode}.`,
    "",
    `Evento: ${eventLabel}`,
    `Motivo: ${input.reason}`,
    `Actor: ${input.actorName}`,
    `Fecha: ${formatTimestamp(now)}`,
    notesBlock.trim().length > 0 ? notesBlock.trim() : "",
    "",
    `Abre la orden aquí: ${orderPath}`,
  ]
    .filter(Boolean)
    .join("\n");

  const tasks = recipients.map(async (recipient) => {
    await sendEmail({
      to: recipient.user.email,
      subject,
      text,
    });
  });

  await Promise.allSettled(tasks);
}

