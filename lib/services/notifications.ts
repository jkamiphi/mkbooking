import { db } from "@/lib/db";
import { NotificationType, Prisma } from "@prisma/client";

type PrismaClientLike = Prisma.TransactionClient | typeof db;

interface ResolvedNotificationRecipients {
  orderId: string;
  orderCode: string;
  organizationId: string | null;
  recipientProfileIds: string[];
}

interface CreateOrderNotificationsInput {
  orderId: string;
  type: NotificationType;
  title: string;
  message: string;
  sourceKey: string;
  actionPath?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}

export async function resolveOrderRecipients(
  client: PrismaClientLike,
  orderId: string
): Promise<ResolvedNotificationRecipients> {
  const order = await client.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      code: true,
      organizationId: true,
      createdById: true,
      organization: {
        select: {
          members: {
            where: { isActive: true },
            select: { userProfileId: true },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error("Orden no encontrada al resolver destinatarios de notificacion.");
  }

  const recipients = new Set<string>();

  if (order.organizationId) {
    for (const member of order.organization?.members ?? []) {
      recipients.add(member.userProfileId);
    }
  }

  if (recipients.size === 0 && order.createdById) {
    recipients.add(order.createdById);
  }

  return {
    orderId: order.id,
    orderCode: order.code,
    organizationId: order.organizationId ?? null,
    recipientProfileIds: [...recipients],
  };
}

export async function createOrderNotifications(
  client: PrismaClientLike,
  input: CreateOrderNotificationsInput
) {
  const sourceKey = input.sourceKey.trim();
  if (!sourceKey) {
    throw new Error("sourceKey es obligatorio para crear notificaciones.");
  }

  const resolved = await resolveOrderRecipients(client, input.orderId);
  if (resolved.recipientProfileIds.length === 0) {
    return {
      createdCount: 0,
      recipientCount: 0,
      orderCode: resolved.orderCode,
    };
  }

  const actionPath =
    input.actionPath === undefined ? `/orders/${input.orderId}` : input.actionPath;

  const result = await client.userNotification.createMany({
    data: resolved.recipientProfileIds.map((userProfileId) => ({
      userProfileId,
      organizationId: resolved.organizationId,
      orderId: input.orderId,
      type: input.type,
      title: input.title,
      message: input.message,
      actionPath,
      sourceKey,
      metadata: input.metadata ?? undefined,
    })),
    skipDuplicates: true,
  });

  return {
    createdCount: result.count,
    recipientCount: resolved.recipientProfileIds.length,
    orderCode: resolved.orderCode,
  };
}

export { NotificationType };
