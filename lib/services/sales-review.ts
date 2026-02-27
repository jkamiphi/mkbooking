import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  SalesReviewEventType,
  SalesReviewResult,
  SalesReviewStatus,
  SalesReviewTargetType,
} from "@prisma/client";
import { notifySalesReviewRequired } from "@/lib/services/sales-review-notifier";

type PrismaClientLike = Prisma.TransactionClient | typeof db;

export interface SalesReviewActor {
  profileId: string;
  fullName: string;
  email: string | null;
}

function buildActorName(input: {
  firstName: string | null;
  lastName: string | null;
  userName: string | null;
  userEmail: string;
}) {
  const byProfile = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  if (byProfile.length > 0) return byProfile;
  if (input.userName && input.userName.trim().length > 0) return input.userName.trim();
  return input.userEmail;
}

export async function resolveSalesReviewActor(userId: string): Promise<SalesReviewActor> {
  const profile = await db.userProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  });

  if (!profile) {
    throw new Error("User profile not found");
  }

  return {
    profileId: profile.id,
    fullName: buildActorName({
      firstName: profile.firstName ?? null,
      lastName: profile.lastName ?? null,
      userName: profile.user.name ?? null,
      userEmail: profile.user.email,
    }),
    email: profile.user.email ?? null,
  };
}

export async function createSalesReviewEvent(
  client: PrismaClientLike,
  input: {
    orderId: string;
    eventType: SalesReviewEventType;
    targetType: SalesReviewTargetType;
    targetId?: string | null;
    result?: SalesReviewResult | null;
    notes?: string | null;
    metadata?: Prisma.InputJsonValue | null;
    actorId?: string | null;
  }
) {
  return client.orderSalesReviewEvent.create({
    data: {
      orderId: input.orderId,
      eventType: input.eventType,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      result: input.result ?? null,
      notes: input.notes ?? null,
      metadata: input.metadata ?? undefined,
      actorId: input.actorId ?? null,
    },
  });
}

export async function reopenOrderSalesReview(
  client: PrismaClientLike,
  input: {
    orderId: string;
    actorId?: string | null;
    notes?: string | null;
    eventType?: SalesReviewEventType;
    targetType?: SalesReviewTargetType;
    targetId?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }
) {
  const now = new Date();
  const updatedOrder = await client.order.update({
    where: { id: input.orderId },
    data: {
      salesReviewStatus: SalesReviewStatus.PENDING_REVIEW,
      salesReviewUpdatedAt: now,
      salesReviewById: null,
      salesReviewNotes: input.notes ?? null,
      salesReviewVersion: {
        increment: 1,
      },
    },
    select: {
      id: true,
      code: true,
      salesReviewStatus: true,
      salesReviewVersion: true,
    },
  });

  await createSalesReviewEvent(client, {
    orderId: input.orderId,
    eventType: input.eventType ?? SalesReviewEventType.REVIEW_REQUIRED,
    targetType: input.targetType ?? SalesReviewTargetType.ORDER,
    targetId: input.targetId ?? null,
    notes: input.notes ?? null,
    metadata: input.metadata ?? null,
    actorId: input.actorId ?? null,
  });

  return updatedOrder;
}

export function isSalesReviewApproved(status: SalesReviewStatus) {
  return status === SalesReviewStatus.APPROVED;
}

export function resolveDocumentEventType(result: SalesReviewResult) {
  return result === SalesReviewResult.APPROVED
    ? SalesReviewEventType.DOCUMENT_APPROVED
    : SalesReviewEventType.DOCUMENT_CHANGES_REQUESTED;
}

export function resolveOrderEventType(result: SalesReviewResult) {
  return result === SalesReviewResult.APPROVED
    ? SalesReviewEventType.ORDER_APPROVED
    : SalesReviewEventType.ORDER_CHANGES_REQUESTED;
}

export async function notifySalesReviewReopened(input: {
  orderId: string;
  orderCode: string;
  eventType: SalesReviewEventType;
  actorName: string;
  reason: string;
  notes?: string | null;
}) {
  await notifySalesReviewRequired({
    orderId: input.orderId,
    orderCode: input.orderCode,
    eventType: input.eventType,
    actorName: input.actorName,
    reason: input.reason,
    notes: input.notes ?? null,
  });
}
