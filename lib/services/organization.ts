import { db } from "@/lib/db";
import {
  OrganizationRelationshipStatus,
  BrandAccessType,
  LegalEntityType,
  OrganizationType,
  OrganizationRole,
  Prisma,
  UserAccountType,
} from "@prisma/client";
import { z } from "zod";
import { resolveActiveOrganizationContextForUser } from "@/lib/services/organization-access";

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
  brandId: z.string().min(1),
  status: z.nativeEnum(OrganizationRelationshipStatus).optional(),
  permissions: organizationRelationshipPermissionsSchema.optional(),
});

export const createStarterOrganizationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  organizationType: z.enum([
    OrganizationType.DIRECT_CLIENT,
    OrganizationType.AGENCY,
  ]),
});

export type CreateAgencyClientRelationshipInput = z.infer<
  typeof createAgencyClientRelationshipSchema
>;
export type CreateStarterOrganizationInput = z.infer<
  typeof createStarterOrganizationSchema
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
      organizationType: OrganizationType.DIRECT_CLIENT,
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
      organizationType: OrganizationType.DIRECT_CLIENT,
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

export async function createStarterOrganization(
  input: CreateStarterOrganizationInput,
  userProfileId: string,
  options?: { userId?: string; activeContextKey?: string | null },
) {
  const displayName = input.name.trim();
  if (!displayName) {
    throw new Error("Escribe un nombre para continuar.");
  }

  const profile = await db.userProfile.findUnique({
    where: { id: userProfileId },
    select: {
      id: true,
      userId: true,
      accountType: true,
      organizationRoles: {
        where: {
          isActive: true,
          organization: { isActive: true },
        },
        select: {
          organizationId: true,
          organization: {
            select: {
              id: true,
              name: true,
              organizationType: true,
            },
          },
        },
      },
    },
  });

  if (!profile) {
    throw new Error("Perfil de usuario no encontrado.");
  }

  const directAgencyMemberships = profile.organizationRoles.filter(
    (membership) => membership.organization.organizationType === OrganizationType.AGENCY,
  );
  const hasDirectOrganizations = profile.organizationRoles.length > 0;

  if (profile.accountType === UserAccountType.DIRECT_CLIENT) {
    if (hasDirectOrganizations) {
      throw new Error(
        "Las cuentas de cliente directo no pueden crear más negocios desde este flujo.",
      );
    }

    return db.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: displayName,
          legalName: displayName,
          organizationType: OrganizationType.DIRECT_CLIENT,
          legalEntityType: LegalEntityType.LEGAL_ENTITY,
          createdById: userProfileId,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userProfileId,
          role: OrganizationRole.OWNER,
          acceptedAt: new Date(),
        },
      });

      const brand = await tx.brand.create({
        data: {
          ownerOrganizationId: organization.id,
          name: displayName,
          legalName: displayName,
          createdBy: userProfileId,
          updatedBy: userProfileId,
        },
      });

      await tx.brandAccess.upsert({
        where: {
          organizationId_brandId: {
            organizationId: organization.id,
            brandId: brand.id,
          },
        },
        create: {
          organizationId: organization.id,
          brandId: brand.id,
          accessType: BrandAccessType.OWNER,
          status: OrganizationRelationshipStatus.ACTIVE,
          createdBy: userProfileId,
          updatedBy: userProfileId,
          canCreateRequests: true,
          canCreateOrders: true,
          canViewBilling: true,
          canManageContacts: true,
        },
        update: {
          accessType: BrandAccessType.OWNER,
          status: OrganizationRelationshipStatus.ACTIVE,
          updatedBy: userProfileId,
          canCreateRequests: true,
          canCreateOrders: true,
          canViewBilling: true,
          canManageContacts: true,
        },
      });

      return brand;
    });
  }

  if (directAgencyMemberships.length === 0) {
    if (input.organizationType !== OrganizationType.AGENCY) {
      throw new Error("Primero debes crear tu agencia principal.");
    }

    return createOrganizationWithOwner(
      {
        name: displayName,
        legalName: displayName,
        organizationType: OrganizationType.AGENCY,
        legalEntityType: LegalEntityType.LEGAL_ENTITY,
      },
      userProfileId,
    );
  }

  if (input.organizationType !== OrganizationType.DIRECT_CLIENT) {
    throw new Error(
      "Las cuentas de agencia solo pueden crear marcas cliente desde este flujo.",
    );
  }

  const resolvedUserId = options?.userId ?? profile.userId;
  const { activeContext } = await resolveActiveOrganizationContextForUser(
    resolvedUserId,
    options?.activeContextKey,
  );
  const explicitAgencyId =
    activeContext?.operatingAgencyOrganizationId ??
    (activeContext?.organizationType === OrganizationType.AGENCY &&
    activeContext?.accessType === "DIRECT"
      ? activeContext.organizationId
      : null);
  const operatingAgencyId =
    (explicitAgencyId &&
    directAgencyMemberships.some(
      (membership) => membership.organizationId === explicitAgencyId,
    )
      ? explicitAgencyId
      : null) ?? directAgencyMemberships[0].organizationId;

  return db.$transaction(async (tx) => {
    const clientBrand = await tx.brand.create({
      data: {
        name: displayName,
        legalName: displayName,
        ownerOrganizationId: null,
        createdBy: userProfileId,
        updatedBy: userProfileId,
      },
    });

    await tx.brandAccess.upsert({
      where: {
        organizationId_brandId: {
          organizationId: operatingAgencyId,
          brandId: clientBrand.id,
        },
      },
      create: {
        organizationId: operatingAgencyId,
        brandId: clientBrand.id,
        accessType: BrandAccessType.DELEGATED,
        status: OrganizationRelationshipStatus.ACTIVE,
        createdBy: userProfileId,
        updatedBy: userProfileId,
        canCreateRequests: true,
        canCreateOrders: true,
        canViewBilling: false,
        canManageContacts: false,
      },
      update: {
        accessType: BrandAccessType.DELEGATED,
        status: OrganizationRelationshipStatus.ACTIVE,
        updatedBy: userProfileId,
      },
    });

    return clientBrand;
  });
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
  const [agencyOrganization, brand] = await Promise.all([
    db.organization.findUnique({
      where: { id: input.agencyOrganizationId },
      select: {
        id: true,
        isActive: true,
        organizationType: true,
      },
    }),
    db.brand.findUnique({
      where: { id: input.brandId },
      select: {
        id: true,
        isActive: true,
      },
    }),
  ]);

  if (!agencyOrganization || !agencyOrganization.isActive) {
    throw new Error("La organización agencia no existe o está inactiva.");
  }

  if (agencyOrganization.organizationType !== OrganizationType.AGENCY) {
    throw new Error("La organización origen debe ser una agencia.");
  }

  if (!brand || !brand.isActive) {
    throw new Error("La marca no existe o está inactiva.");
  }

  const permissions = resolveRelationshipPermissions(input.permissions);

  return db.brandAccess.upsert({
    where: {
      organizationId_brandId: {
        organizationId: input.agencyOrganizationId,
        brandId: input.brandId,
      },
    },
    create: {
      organizationId: input.agencyOrganizationId,
      brandId: input.brandId,
      accessType: BrandAccessType.DELEGATED,
      status: input.status ?? OrganizationRelationshipStatus.ACTIVE,
      createdBy: createdByProfileId,
      updatedBy: createdByProfileId,
      ...permissions,
    },
    update: {
      accessType: BrandAccessType.DELEGATED,
      status: input.status ?? OrganizationRelationshipStatus.ACTIVE,
      updatedBy: createdByProfileId,
      ...permissions,
    },
    include: {
      organization: true,
      brand: true,
    },
  });
}

export async function listAgencyClients(agencyOrganizationId: string) {
  return db.brandAccess.findMany({
    where: {
      organizationId: agencyOrganizationId,
    },
    orderBy: [
      { status: "asc" },
      { brand: { name: "asc" } },
    ],
    include: {
      brand: true,
    },
  });
}

export async function listClientAgencies(brandId: string) {
  return db.brandAccess.findMany({
    where: {
      brandId,
    },
    orderBy: [
      { status: "asc" },
      { organization: { name: "asc" } },
    ],
    include: {
      organization: true,
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
