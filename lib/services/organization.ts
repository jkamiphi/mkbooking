import { db } from "@/lib/db";
import {
  LegalEntityType,
  OrganizationRelationshipStatus,
  OrganizationType,
  OrganizationRole,
  Prisma,
} from "@prisma/client";
import { z } from "zod";

// ============================================================================
// Schemas
// ============================================================================

export const createOrganizationSchema = z.object({
  // Basic Information
  name: z.string().min(1, "Name is required"),
  legalName: z.string().optional(),
  tradeName: z.string().optional(),
  organizationType: z.nativeEnum(OrganizationType),
  legalEntityType: z.nativeEnum(LegalEntityType),

  // Tax/Legal Identifiers
  taxId: z.string().optional(),
  dvCode: z.string().optional(),
  cedula: z.string().optional(),
  passportNumber: z.string().optional(),

  // Contact Information
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),

  // Address
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),

  // Business Details
  description: z.string().optional(),
  industry: z.string().optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial().omit({
  organizationType: true,
  legalEntityType: true,
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

// Schema for natural person registration
export const naturalPersonRegistrationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  cedula: z.string().min(1, "Cedula is required"),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

// Schema for business registration
export const businessRegistrationSchema = z.object({
  legalName: z.string().min(1, "Legal name is required"),
  tradeName: z.string().optional(),
  taxId: z.string().min(1, "RUC/Tax ID is required"),
  dvCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  industry: z.string().optional(),
});

export type NaturalPersonRegistrationInput = z.infer<typeof naturalPersonRegistrationSchema>;
export type BusinessRegistrationInput = z.infer<typeof businessRegistrationSchema>;

export const organizationRelationshipPermissionsSchema = z.object({
  canCreateRequests: z.boolean().optional(),
  canCreateOrders: z.boolean().optional(),
  canViewBilling: z.boolean().optional(),
  canManageContacts: z.boolean().optional(),
});

export const createAgencyClientRelationshipSchema = z.object({
  agencyOrganizationId: z.string().min(1),
  advertiserOrganizationId: z.string().min(1),
  status: z.nativeEnum(OrganizationRelationshipStatus).optional(),
  permissions: organizationRelationshipPermissionsSchema.optional(),
});

export type CreateAgencyClientRelationshipInput = z.infer<
  typeof createAgencyClientRelationshipSchema
>;

// ============================================================================
// Service Functions
// ============================================================================

export async function getOrganizationById(id: string) {
  return db.organization.findUnique({
    where: { id },
    include: {
      members: {
        where: { isActive: true },
        include: {
          userProfile: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      },
      contacts: {
        where: { isActive: true },
      },
      documents: true,
    },
  });
}

export async function getOrganizationsByUserProfileId(userProfileId: string) {
  const memberships = await db.organizationMember.findMany({
    where: {
      userProfileId,
      isActive: true,
    },
    include: {
      organization: true,
    },
  });

  return memberships.map((m) => ({
    ...m.organization,
    role: m.role,
    membershipId: m.id,
  }));
}

export async function createOrganization(
  input: CreateOrganizationInput,
  createdByProfileId: string
) {
  return db.organization.create({
    data: {
      name: input.name,
      legalName: input.legalName,
      tradeName: input.tradeName,
      organizationType: input.organizationType,
      legalEntityType: input.legalEntityType,
      taxId: input.taxId,
      dvCode: input.dvCode,
      cedula: input.cedula,
      passportNumber: input.passportNumber,
      email: input.email,
      phone: input.phone,
      whatsapp: input.whatsapp,
      website: input.website || null,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      province: input.province,
      country: input.country,
      postalCode: input.postalCode,
      description: input.description,
      industry: input.industry,
      createdById: createdByProfileId,
    },
  });
}

export async function createOrganizationWithOwner(
  input: CreateOrganizationInput,
  userProfileId: string
) {
  return db.$transaction(async (tx) => {
    // Create the organization
    const organization = await tx.organization.create({
      data: {
        name: input.name,
        legalName: input.legalName,
        tradeName: input.tradeName,
        organizationType: input.organizationType,
        legalEntityType: input.legalEntityType,
        taxId: input.taxId,
        dvCode: input.dvCode,
        cedula: input.cedula,
        passportNumber: input.passportNumber,
        email: input.email,
        phone: input.phone,
        whatsapp: input.whatsapp,
        website: input.website || null,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        province: input.province,
        country: input.country,
        postalCode: input.postalCode,
        description: input.description,
        industry: input.industry,
        createdById: userProfileId,
      },
    });

    // Add the user as OWNER
    await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userProfileId,
        role: OrganizationRole.OWNER,
        acceptedAt: new Date(),
      },
    });

    return organization;
  });
}

export async function registerNaturalPerson(
  input: NaturalPersonRegistrationInput,
  userProfileId: string
) {
  const fullName = `${input.firstName} ${input.lastName}`;

  return createOrganizationWithOwner(
    {
      name: fullName,
      legalName: fullName,
      organizationType: OrganizationType.ADVERTISER,
      legalEntityType: LegalEntityType.NATURAL_PERSON,
      cedula: input.cedula,
      phone: input.phone,
      email: input.email,
    },
    userProfileId
  );
}

export async function registerBusiness(
  input: BusinessRegistrationInput,
  userProfileId: string
) {
  return createOrganizationWithOwner(
    {
      name: input.tradeName || input.legalName,
      legalName: input.legalName,
      tradeName: input.tradeName,
      organizationType: OrganizationType.ADVERTISER,
      legalEntityType: LegalEntityType.LEGAL_ENTITY,
      taxId: input.taxId,
      dvCode: input.dvCode,
      phone: input.phone,
      email: input.email,
      industry: input.industry,
    },
    userProfileId
  );
}

export async function registerAgency(
  input: BusinessRegistrationInput,
  userProfileId: string
) {
  return createOrganizationWithOwner(
    {
      name: input.tradeName || input.legalName,
      legalName: input.legalName,
      tradeName: input.tradeName,
      organizationType: OrganizationType.AGENCY,
      legalEntityType: LegalEntityType.LEGAL_ENTITY,
      taxId: input.taxId,
      dvCode: input.dvCode,
      phone: input.phone,
      email: input.email,
      industry: input.industry,
    },
    userProfileId
  );
}

export async function updateOrganization(
  id: string,
  input: UpdateOrganizationInput,
  updatedBy?: string
) {
  return db.organization.update({
    where: { id },
    data: {
      ...input,
      website: input.website || null,
      updatedBy,
    },
  });
}

export async function deleteOrganization(id: string) {
  return db.organization.delete({
    where: { id },
  });
}

export async function addOrganizationMember(
  organizationId: string,
  userProfileId: string,
  role: OrganizationRole,
  invitedBy?: string
) {
  return db.organizationMember.create({
    data: {
      organizationId,
      userProfileId,
      role,
      invitedBy,
    },
  });
}

export async function updateOrganizationMemberRole(
  memberId: string,
  role: OrganizationRole
) {
  return db.organizationMember.update({
    where: { id: memberId },
    data: { role },
  });
}

export async function removeOrganizationMember(memberId: string) {
  return db.organizationMember.update({
    where: { id: memberId },
    data: { isActive: false },
  });
}

function resolveRelationshipPermissions(
  permissions?: CreateAgencyClientRelationshipInput["permissions"]
) {
  return {
    canCreateRequests: permissions?.canCreateRequests ?? true,
    canCreateOrders: permissions?.canCreateOrders ?? true,
    canViewBilling: permissions?.canViewBilling ?? false,
    canManageContacts: permissions?.canManageContacts ?? false,
  };
}

export async function createAgencyClientRelationship(
  input: CreateAgencyClientRelationshipInput,
  createdByProfileId: string
) {
  if (input.agencyOrganizationId === input.advertiserOrganizationId) {
    throw new Error("La agencia y el cliente no pueden ser la misma organización.");
  }

  const [agencyOrganization, advertiserOrganization] = await Promise.all([
    db.organization.findUnique({
      where: { id: input.agencyOrganizationId },
      select: {
        id: true,
        isActive: true,
        organizationType: true,
      },
    }),
    db.organization.findUnique({
      where: { id: input.advertiserOrganizationId },
      select: {
        id: true,
        isActive: true,
        organizationType: true,
      },
    }),
  ]);

  if (!agencyOrganization || !agencyOrganization.isActive) {
    throw new Error("La organización agencia no existe o está inactiva.");
  }

  if (agencyOrganization.organizationType !== OrganizationType.AGENCY) {
    throw new Error("La organización origen debe ser una agencia.");
  }

  if (!advertiserOrganization || !advertiserOrganization.isActive) {
    throw new Error("La organización cliente no existe o está inactiva.");
  }

  if (advertiserOrganization.organizationType !== OrganizationType.ADVERTISER) {
    throw new Error("La organización destino debe ser un anunciante.");
  }

  const permissions = resolveRelationshipPermissions(input.permissions);

  return db.organizationRelationship.upsert({
    where: {
      sourceOrganizationId_targetOrganizationId_relationshipType: {
        sourceOrganizationId: input.agencyOrganizationId,
        targetOrganizationId: input.advertiserOrganizationId,
        relationshipType: "AGENCY_CLIENT",
      },
    },
    create: {
      sourceOrganizationId: input.agencyOrganizationId,
      targetOrganizationId: input.advertiserOrganizationId,
      relationshipType: "AGENCY_CLIENT",
      status: input.status ?? OrganizationRelationshipStatus.ACTIVE,
      createdById: createdByProfileId,
      updatedBy: createdByProfileId,
      ...permissions,
    },
    update: {
      status: input.status ?? OrganizationRelationshipStatus.ACTIVE,
      updatedBy: createdByProfileId,
      ...permissions,
    },
    include: {
      sourceOrganization: true,
      targetOrganization: true,
    },
  });
}

export async function listAgencyClients(agencyOrganizationId: string) {
  return db.organizationRelationship.findMany({
    where: {
      sourceOrganizationId: agencyOrganizationId,
      relationshipType: "AGENCY_CLIENT",
    },
    orderBy: [
      { status: "asc" },
      { targetOrganization: { name: "asc" } },
    ],
    include: {
      targetOrganization: true,
    },
  });
}

export async function listClientAgencies(advertiserOrganizationId: string) {
  return db.organizationRelationship.findMany({
    where: {
      targetOrganizationId: advertiserOrganizationId,
      relationshipType: "AGENCY_CLIENT",
    },
    orderBy: [
      { status: "asc" },
      { sourceOrganization: { name: "asc" } },
    ],
    include: {
      sourceOrganization: true,
    },
  });
}

export async function listOrganizations(options?: {
  organizationType?: OrganizationType;
  legalEntityType?: LegalEntityType;
  isActive?: boolean;
  isVerified?: boolean;
  skip?: number;
  take?: number;
  orderBy?: Prisma.OrganizationOrderByWithRelationInput;
}) {
  const {
    organizationType,
    legalEntityType,
    isActive,
    isVerified,
    skip = 0,
    take = 50,
    orderBy,
  } = options ?? {};

  const where: Prisma.OrganizationWhereInput = {};
  if (organizationType) where.organizationType = organizationType;
  if (legalEntityType) where.legalEntityType = legalEntityType;
  if (isActive !== undefined) where.isActive = isActive;
  if (isVerified !== undefined) where.isVerified = isVerified;

  const [organizations, total] = await Promise.all([
    db.organization.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: "desc" },
    }),
    db.organization.count({ where }),
  ]);

  return {
    organizations,
    total,
    hasMore: skip + organizations.length < total,
  };
}

export async function searchOrganizations(query: string, take = 10) {
  return db.organization.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { legalName: { contains: query, mode: "insensitive" } },
        { tradeName: { contains: query, mode: "insensitive" } },
        { taxId: { contains: query, mode: "insensitive" } },
        { cedula: { contains: query, mode: "insensitive" } },
      ],
      isActive: true,
    },
    take,
  });
}

export async function checkCedulaExists(cedula: string) {
  const org = await db.organization.findUnique({
    where: { cedula },
    select: { id: true },
  });
  return !!org;
}

export async function checkTaxIdExists(taxId: string) {
  const org = await db.organization.findUnique({
    where: { taxId },
    select: { id: true },
  });
  return !!org;
}
