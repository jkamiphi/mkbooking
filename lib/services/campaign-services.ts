import { db } from "@/lib/db";
import { z } from "zod";

const serviceCodeRegex = /^[A-Z0-9_\-]{2,40}$/;

export const createCampaignServiceSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      serviceCodeRegex,
      "Código inválido. Usa 2-40 caracteres A-Z, 0-9, guion o guion bajo."
    ),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  basePrice: z.number().min(0),
  currency: z.string().trim().min(3).max(10).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const updateCampaignServiceSchema = z.object({
  id: z.string().min(1),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      serviceCodeRegex,
      "Código inválido. Usa 2-40 caracteres A-Z, 0-9, guion o guion bajo."
    )
    .optional(),
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  basePrice: z.number().min(0).optional(),
  currency: z.string().trim().min(3).max(10).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const toggleCampaignServiceActiveSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
});

export async function listPublicCampaignServices() {
  return db.campaignService.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function listAdminCampaignServices() {
  return db.campaignService.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createCampaignService(
  input: z.infer<typeof createCampaignServiceSchema>
) {
  return db.campaignService.create({
    data: {
      code: input.code.toUpperCase(),
      name: input.name,
      description: input.description || null,
      basePrice: input.basePrice,
      currency: input.currency?.toUpperCase() || "USD",
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function updateCampaignService(
  input: z.infer<typeof updateCampaignServiceSchema>
) {
  return db.campaignService.update({
    where: { id: input.id },
    data: {
      code: input.code?.toUpperCase(),
      name: input.name,
      description:
        input.description === undefined ? undefined : input.description || null,
      basePrice: input.basePrice,
      currency: input.currency?.toUpperCase(),
      sortOrder: input.sortOrder,
    },
  });
}

export async function toggleCampaignServiceActive(
  input: z.infer<typeof toggleCampaignServiceActiveSchema>
) {
  if (input.isActive !== undefined) {
    return db.campaignService.update({
      where: { id: input.id },
      data: { isActive: input.isActive },
    });
  }

  const current = await db.campaignService.findUniqueOrThrow({
    where: { id: input.id },
    select: { id: true, isActive: true },
  });

  return db.campaignService.update({
    where: { id: input.id },
    data: { isActive: !current.isActive },
  });
}
