import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { ensureUserNotificationPreferences } from "@/lib/services/user-profile";
import { NotificationType, Prisma } from "@prisma/client";

type PrismaClientLike = Prisma.TransactionClient | typeof db;

interface ResolvedOrderNotificationRecipients {
  orderId: string;
  orderCode: string;
  organizationId: string | null;
  recipients: Array<{
    userProfileId: string;
    email: string | null;
    emailEnabled: boolean;
    inAppEnabled: boolean;
  }>;
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

export interface PreparedNotificationEmail {
  to: string;
  subject: string;
  text: string;
}

function buildNotificationEmailText(input: {
  title: string;
  message: string;
  orderCode: string;
  actionPath: string | null;
}) {
  return [
    input.title,
    "",
    input.message,
    "",
    `Orden: ${input.orderCode}`,
    input.actionPath ? `Ruta: ${input.actionPath}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function resolveOrderRecipientProfileIds(
  client: PrismaClientLike,
  orderId: string,
) {
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

async function loadRecipientProfiles(
  client: PrismaClientLike,
  input: {
    profileIds: string[];
    type: NotificationType;
  },
) {
  const profiles = await client.userProfile.findMany({
    where: {
      id: {
        in: input.profileIds,
      },
    },
    select: {
      id: true,
      emailNotifications: true,
      user: {
        select: {
          email: true,
        },
      },
      notificationPreferences: {
        where: { type: input.type },
        select: {
          type: true,
          emailEnabled: true,
          inAppEnabled: true,
        },
      },
    },
  });

  const ensuredCounts = await Promise.all(
    profiles.map((profile) =>
      ensureUserNotificationPreferences(client, {
        userProfileId: profile.id,
        emailEnabled: profile.emailNotifications,
        existingTypes: profile.notificationPreferences.map((preference) => preference.type),
      }),
    ),
  );

  if (!ensuredCounts.some((count) => count > 0)) {
    return profiles;
  }

  return client.userProfile.findMany({
    where: {
      id: {
        in: input.profileIds,
      },
    },
    select: {
      id: true,
      emailNotifications: true,
      user: {
        select: {
          email: true,
        },
      },
      notificationPreferences: {
        where: { type: input.type },
        select: {
          type: true,
          emailEnabled: true,
          inAppEnabled: true,
        },
      },
    },
  });
}

export async function resolveOrderRecipients(
  client: PrismaClientLike,
  orderId: string,
  type: NotificationType,
): Promise<ResolvedOrderNotificationRecipients> {
  const resolvedOrder = await resolveOrderRecipientProfileIds(client, orderId);

  if (resolvedOrder.recipientProfileIds.length === 0) {
    return {
      orderId: resolvedOrder.orderId,
      orderCode: resolvedOrder.orderCode,
      organizationId: resolvedOrder.organizationId,
      recipients: [],
    };
  }

  const profiles = await loadRecipientProfiles(client, {
    profileIds: resolvedOrder.recipientProfileIds,
    type,
  });

  return {
    orderId: resolvedOrder.orderId,
    orderCode: resolvedOrder.orderCode,
    organizationId: resolvedOrder.organizationId,
    recipients: profiles.map((profile) => {
      const preference = profile.notificationPreferences[0];

      return {
        userProfileId: profile.id,
        email: profile.user?.email ?? null,
        emailEnabled: preference?.emailEnabled ?? profile.emailNotifications,
        inAppEnabled: preference?.inAppEnabled ?? true,
      };
    }),
  };
}

export async function createOrderNotifications(
  client: PrismaClientLike,
  input: CreateOrderNotificationsInput,
) {
  const sourceKey = input.sourceKey.trim();
  if (!sourceKey) {
    throw new Error("sourceKey es obligatorio para crear notificaciones.");
  }

  const resolved = await resolveOrderRecipients(client, input.orderId, input.type);
  if (resolved.recipients.length === 0) {
    return {
      createdCount: 0,
      recipientCount: 0,
      orderCode: resolved.orderCode,
      emailDeliveries: [] as PreparedNotificationEmail[],
    };
  }

  const actionPath =
    input.actionPath === undefined ? `/orders/${input.orderId}` : input.actionPath;

  const inAppRecipients = resolved.recipients.filter(
    (recipient) => recipient.inAppEnabled,
  );

  const emailDeliveries = resolved.recipients
    .filter(
      (recipient) =>
        recipient.emailEnabled &&
        typeof recipient.email === "string" &&
        recipient.email.trim().length > 0,
    )
    .map((recipient) => ({
      to: recipient.email!.trim(),
      subject: `[MK Booking] ${input.title}`,
      text: buildNotificationEmailText({
        title: input.title,
        message: input.message,
        orderCode: resolved.orderCode,
        actionPath,
      }),
    }));

  const result =
    inAppRecipients.length > 0
      ? await client.userNotification.createMany({
          data: inAppRecipients.map((recipient) => ({
            userProfileId: recipient.userProfileId,
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
        })
      : { count: 0 };

  return {
    createdCount: result.count,
    recipientCount: resolved.recipients.length,
    orderCode: resolved.orderCode,
    emailDeliveries,
  };
}

export async function sendPreparedNotificationEmails(
  deliveries: PreparedNotificationEmail[],
) {
  if (deliveries.length === 0) {
    return;
  }

  await Promise.allSettled(
    deliveries.map((delivery) =>
      sendEmail({
        to: delivery.to,
        subject: delivery.subject,
        text: delivery.text,
      }),
    ),
  );
}

export { NotificationType };
