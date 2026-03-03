import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveChecklistTemplateByStructureType } from "@/lib/services/installer-checklist-templates";

type PrismaClientLike = Prisma.TransactionClient | typeof db;

export async function ensureChecklistForWorkOrder(
  client: PrismaClientLike,
  workOrderId: string
) {
  const existingItems = await client.orderOperationalChecklistItem.findMany({
    where: { workOrderId },
    orderBy: [{ createdAt: "asc" }],
  });

  if (existingItems.length > 0) {
    return existingItems;
  }

  const workOrder = await client.orderOperationalWorkOrder.findUnique({
    where: { id: workOrderId },
    select: {
      id: true,
      face: {
        select: {
          asset: {
            select: {
              structureType: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!workOrder) {
    throw new Error("OT operativa no encontrada para generar checklist.");
  }

  const template = resolveChecklistTemplateByStructureType(
    workOrder.face.asset.structureType.name
  );

  if (template.length > 0) {
    await client.orderOperationalChecklistItem.createMany({
      data: template.map((item) => ({
        workOrderId,
        code: item.code,
        label: item.label,
        isRequired: item.isRequired,
      })),
      skipDuplicates: true,
    });
  }

  return client.orderOperationalChecklistItem.findMany({
    where: { workOrderId },
    orderBy: [{ createdAt: "asc" }],
  });
}
