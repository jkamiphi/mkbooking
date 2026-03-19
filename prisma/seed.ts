import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import crypto from "crypto";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Batch size para procesamiento en chunks y reducir uso de memoria
const BATCH_SIZE = 50;

// Reducido para ambiente de producción - ajusta según necesites
const provinceZones = [
  {
    name: "Panamá",
    zones: ["Ciudad de Panamá", "Costa del Este", "Punta Pacifica"],
  },
  { name: "Panamá Oeste", zones: ["Arraiján", "La Chorrera", "Costa Verde"] },
  { name: "Colón", zones: ["Colón Centro", "Sabanitas"] },
  { name: "Chiriquí", zones: ["David", "Boquete"] },
  { name: "Veraguas", zones: ["Santiago"] },
];

const structureTypes = [
  "Mupi Giant",
  "Bastidor",
  "Mini Unipolar",
  "Pantalla Digital",
  "Pared",
  "Perimetral",
  "Unipolar",
  "Valla",
  "Parada",
];

const roadTypes = [
  "Autopista",
  "Avenida",
  "Boulevard",
  "Carretera Interamericana",
  "Corredor Norte",
  "Corredor Sur",
  "Calle",
  "Vía Principal",
  "Vía Secundaria",
  "Acceso Portuario",
];

const facePositions = [
  "Frontal",
  "Lateral Izquierda",
  "Lateral Derecha",
  "Esquina",
  "Isla Central",
  "Puente Peatonal",
];

const mountingTypes = [
  "Lona Frontlit",
  "Lona Backlit",
  "Vinil Adhesivo",
  "Pantalla LED",
  "Pantalla LCD",
  "Impresión Directa",
];

const restrictionTags = [
  { code: "NO_ALCOHOL", label: "Sin alcohol" },
  { code: "NO_TABACO", label: "Sin tabaco" },
  { code: "NO_POLITICA", label: "Sin mensajes políticos" },
  { code: "ZONA_SENSIBLE", label: "Zona sensible (escuelas/hospitales)" },
  { code: "APROBACION_MUNICIPAL", label: "Requiere aprobación municipal" },
  { code: "LIMITE_LUMINOSIDAD", label: "Límite de luminosidad" },
];

const campaignServices = [
  {
    code: "DISENO_ARTE",
    name: "Diseño de arte",
    description: "Diseño base de pieza gráfica para campaña OOH.",
    basePrice: 180,
    currency: "USD",
    sortOrder: 10,
  },
  {
    code: "ADAPTACION_FORMATOS",
    name: "Adaptación de formatos",
    description: "Adaptación del arte a múltiples medidas y formatos.",
    basePrice: 120,
    currency: "USD",
    sortOrder: 20,
  },
  {
    code: "PRODUCCION_LONA",
    name: "Producción de lona",
    description: "Impresión y acabado de lona publicitaria.",
    basePrice: 250,
    currency: "USD",
    sortOrder: 30,
  },
  {
    code: "VINIL_MICROPERFORADO",
    name: "Vinil microperforado",
    description: "Producción de vinil para superficies específicas.",
    basePrice: 220,
    currency: "USD",
    sortOrder: 40,
  },
  {
    code: "INSTALACION_ARTE",
    name: "Instalación de arte",
    description: "Montaje del arte en caras asignadas.",
    basePrice: 200,
    currency: "USD",
    sortOrder: 50,
  },
  {
    code: "DESINSTALACION_ARTE",
    name: "Desinstalación de arte",
    description: "Retiro del arte al finalizar campaña.",
    basePrice: 120,
    currency: "USD",
    sortOrder: 60,
  },
  {
    code: "TRANSPORTE_LOGISTICA",
    name: "Transporte y logística",
    description: "Movimiento de material entre bodega y ubicaciones.",
    basePrice: 90,
    currency: "USD",
    sortOrder: 70,
  },
  {
    code: "INSTALACION_NOCTURNA",
    name: "Instalación nocturna",
    description: "Recargo por instalación en horario nocturno.",
    basePrice: 150,
    currency: "USD",
    sortOrder: 80,
  },
  {
    code: "PERMISOS_MUNICIPALES",
    name: "Gestión de permisos",
    description: "Trámite administrativo de permisos de instalación.",
    basePrice: 140,
    currency: "USD",
    sortOrder: 90,
  },
  {
    code: "REPORTE_FOTOGRAFICO",
    name: "Reporte fotográfico",
    description: "Evidencia de instalación y estado por campaña.",
    basePrice: 75,
    currency: "USD",
    sortOrder: 100,
  },
  {
    code: "MONITOREO_CAMPANA",
    name: "Monitoreo de campaña",
    description: "Seguimiento operativo durante la vigencia.",
    basePrice: 110,
    currency: "USD",
    sortOrder: 110,
  },
  {
    code: "MANTENIMIENTO_BASICO",
    name: "Mantenimiento básico",
    description: "Ajustes menores y limpieza durante campaña.",
    basePrice: 95,
    currency: "USD",
    sortOrder: 120,
  },
];

const structureSizes: Record<string, { width: number; height: number }> = {
  "Mupi Giant": { width: 4.0, height: 3.0 },
  Bastidor: { width: 6.0, height: 3.0 },
  "Mini Unipolar": { width: 3.0, height: 2.0 },
  "Pantalla Digital": { width: 6.0, height: 3.5 },
  Pared: { width: 10.0, height: 5.0 },
  Perimetral: { width: 8.0, height: 4.0 },
  Unipolar: { width: 12.0, height: 6.0 },
  Valla: { width: 14.0, height: 7.0 },
  Parada: { width: 1.2, height: 1.8 },
};

const structureBasePrice: Record<string, number> = {
  "Pantalla Digital": 280,
  Unipolar: 220,
  Valla: 200,
  Pared: 180,
  "Mupi Giant": 140,
  Bastidor: 130,
  Perimetral: 120,
  "Mini Unipolar": 110,
  Parada: 90,
};

interface InstallerSeedCoverage {
  provinceName: string;
  zoneName: string;
}

interface InstallerSeedUser {
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  password: string;
  isEnabled: boolean;
  maxActiveWorkOrders: number;
  coverage: InstallerSeedCoverage[];
  notes?: string;
  isActive?: boolean;
}

interface ZoneWithProvince {
  id: string;
  name: string;
  province: {
    name: string;
  };
}

interface SeedUserInput {
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  password: string;
  systemRole:
    | "SUPERADMIN"
    | "STAFF"
    | "DESIGNER"
    | "SALES"
    | "OPERATIONS_PRINT"
    | "INSTALLER"
    | "CUSTOMER";
  accountType: "DIRECT_CLIENT" | "AGENCY";
  isActive?: boolean;
}

interface SeedBusinessUser {
  email: string;
  name: string;
  firstName: string;
  lastName: string;
}

interface SeedAgencyOrganization {
  key: string;
  name: string;
  legalName: string;
  tradeName: string;
  taxId: string;
  email: string;
  phone: string;
  industry: string;
  ownerUser: SeedBusinessUser;
}

interface SeedDirectClientOrganization {
  key: string;
  name: string;
  legalName: string;
  tradeName: string;
  taxId: string;
  email: string;
  phone: string;
  industry: string;
  ownerUser: SeedBusinessUser;
  brand: {
    name: string;
    legalName: string;
    tradeName: string;
    taxId: string;
    email: string;
    phone: string;
    industry: string;
  };
}

interface SeedOrganizationInput {
  name: string;
  legalName: string;
  tradeName: string | null;
  organizationType: "DIRECT_CLIENT" | "AGENCY";
  taxId: string;
  email: string | null;
  phone: string | null;
  industry: string | null;
  createdByProfileId: string;
}

interface SeedBrandInput {
  ownerOrganizationId: string;
  name: string;
  legalName: string;
  tradeName: string | null;
  taxId: string;
  email: string | null;
  phone: string | null;
  industry: string | null;
  createdByProfileId: string;
}

const seedB2BPassword = "Seed123!";

const platformInternalUsers: SeedUserInput[] = [
  {
    email: "seed.superadmin@mkbooking.com",
    name: "Seed Superadmin",
    firstName: "Seed",
    lastName: "Superadmin",
    password: seedB2BPassword,
    systemRole: "SUPERADMIN",
    accountType: "DIRECT_CLIENT",
  },
  {
    email: "seed.staff@mkbooking.com",
    name: "Seed Staff",
    firstName: "Seed",
    lastName: "Staff",
    password: seedB2BPassword,
    systemRole: "STAFF",
    accountType: "DIRECT_CLIENT",
  },
  {
    email: "seed.designer@mkbooking.com",
    name: "Seed Designer",
    firstName: "Seed",
    lastName: "Designer",
    password: seedB2BPassword,
    systemRole: "DESIGNER",
    accountType: "DIRECT_CLIENT",
  },
  {
    email: "seed.sales@mkbooking.com",
    name: "Seed Sales",
    firstName: "Seed",
    lastName: "Sales",
    password: seedB2BPassword,
    systemRole: "SALES",
    accountType: "DIRECT_CLIENT",
  },
  {
    email: "seed.operations.print@mkbooking.com",
    name: "Seed Operations Print",
    firstName: "Seed",
    lastName: "Operations Print",
    password: seedB2BPassword,
    systemRole: "OPERATIONS_PRINT",
    accountType: "DIRECT_CLIENT",
  },
];

const seedAgencies: SeedAgencyOrganization[] = [
  {
    key: "agency_a",
    name: "Agencia A - MK Nexus",
    legalName: "MK Nexus Agency S.A.",
    tradeName: "MK Nexus",
    taxId: "RUC-AGY-1001-01",
    email: "contacto@nexus-agency.pa",
    phone: "+507 6200-1001",
    industry: "Advertising Agency",
    ownerUser: {
      email: "owner.nexus@mkbooking.com",
      name: "Laura Batista",
      firstName: "Laura",
      lastName: "Batista",
    },
  },
  {
    key: "agency_b",
    name: "Agencia B - Istmo Growth",
    legalName: "Istmo Growth Media S.A.",
    tradeName: "Istmo Growth",
    taxId: "RUC-AGY-1002-01",
    email: "contacto@istmogrowth.pa",
    phone: "+507 6200-1002",
    industry: "Media Buying",
    ownerUser: {
      email: "owner.istmo@mkbooking.com",
      name: "Gabriel Ríos",
      firstName: "Gabriel",
      lastName: "Ríos",
    },
  },
  {
    key: "agency_c",
    name: "Agencia C - Canal Impact",
    legalName: "Canal Impact Partners S.A.",
    tradeName: "Canal Impact",
    taxId: "RUC-AGY-1003-01",
    email: "contacto@canalimpact.pa",
    phone: "+507 6200-1003",
    industry: "Integrated Marketing",
    ownerUser: {
      email: "owner.canalimpact@mkbooking.com",
      name: "Patricia León",
      firstName: "Patricia",
      lastName: "León",
    },
  },
];

const seedDirectClients: SeedDirectClientOrganization[] = [
  {
    key: "client_1",
    name: "Café Montaña Panamá",
    legalName: "Café Montaña Panamá S.A.",
    tradeName: "Café Montaña",
    taxId: "RUC-CLI-2001-01",
    email: "compras@cafemontana.pa",
    phone: "+507 6300-2001",
    industry: "Food & Beverage",
    ownerUser: {
      email: "owner.cafemontana@mkbooking.com",
      name: "Ricardo Castillo",
      firstName: "Ricardo",
      lastName: "Castillo",
    },
    brand: {
      name: "Café Montaña",
      legalName: "Café Montaña Panamá S.A.",
      tradeName: "Café Montaña",
      taxId: "RUC-BRD-3001-01",
      email: "brand@cafemontana.pa",
      phone: "+507 6300-3001",
      industry: "Coffee Retail",
    },
  },
  {
    key: "client_2",
    name: "Banco Faro Panamá",
    legalName: "Banco Faro Panamá S.A.",
    tradeName: "Banco Faro",
    taxId: "RUC-CLI-2002-01",
    email: "marketing@bancofaro.pa",
    phone: "+507 6300-2002",
    industry: "Financial Services",
    ownerUser: {
      email: "owner.bancofaro@mkbooking.com",
      name: "Andrea Vega",
      firstName: "Andrea",
      lastName: "Vega",
    },
    brand: {
      name: "Banco Faro",
      legalName: "Banco Faro Panamá S.A.",
      tradeName: "Banco Faro",
      taxId: "RUC-BRD-3002-01",
      email: "brand@bancofaro.pa",
      phone: "+507 6300-3002",
      industry: "Banking",
    },
  },
  {
    key: "client_3",
    name: "Tecnoplus Retail Panamá",
    legalName: "Tecnoplus Retail Panamá S.A.",
    tradeName: "Tecnoplus",
    taxId: "RUC-CLI-2003-01",
    email: "marketing@tecnoplus.pa",
    phone: "+507 6300-2003",
    industry: "Retail",
    ownerUser: {
      email: "owner.tecnoplus@mkbooking.com",
      name: "Miguel Pitti",
      firstName: "Miguel",
      lastName: "Pitti",
    },
    brand: {
      name: "Tecnoplus",
      legalName: "Tecnoplus Retail Panamá S.A.",
      tradeName: "Tecnoplus",
      taxId: "RUC-BRD-3003-01",
      email: "brand@tecnoplus.pa",
      phone: "+507 6300-3003",
      industry: "Consumer Electronics",
    },
  },
  {
    key: "client_4",
    name: "Salud Vital Labs",
    legalName: "Salud Vital Labs S.A.",
    tradeName: "Salud Vital",
    taxId: "RUC-CLI-2004-01",
    email: "marketing@saludvital.pa",
    phone: "+507 6300-2004",
    industry: "Healthcare",
    ownerUser: {
      email: "owner.saludvital@mkbooking.com",
      name: "Carla De León",
      firstName: "Carla",
      lastName: "De León",
    },
    brand: {
      name: "Salud Vital",
      legalName: "Salud Vital Labs S.A.",
      tradeName: "Salud Vital",
      taxId: "RUC-BRD-3004-01",
      email: "brand@saludvital.pa",
      phone: "+507 6300-3004",
      industry: "Health Products",
    },
  },
];

const agencyBrandDistribution: Array<{ agencyKey: string; clientKeys: string[] }> = [
  {
    agencyKey: "agency_a",
    clientKeys: ["client_1", "client_2", "client_3"],
  },
  {
    agencyKey: "agency_b",
    clientKeys: ["client_2", "client_3", "client_4"],
  },
  {
    agencyKey: "agency_c",
    clientKeys: ["client_1", "client_3", "client_4"],
  },
];

const defaultInstallerPassword =
  process.env.SEED_INSTALLER_PASSWORD || "Installer123!";

const installerUsers: InstallerSeedUser[] = [
  {
    email: "instalador.panama@mkbooking.com",
    name: "Carlos Morales",
    firstName: "Carlos",
    lastName: "Morales",
    password: defaultInstallerPassword,
    isEnabled: true,
    maxActiveWorkOrders: 4,
    notes: "Cobertura principal en ciudad y costa este.",
    coverage: [
      { provinceName: "Panamá", zoneName: "Ciudad de Panamá" },
      { provinceName: "Panamá", zoneName: "Costa del Este" },
    ],
  },
  {
    email: "instalador.oeste@mkbooking.com",
    name: "María González",
    firstName: "María",
    lastName: "González",
    password: defaultInstallerPassword,
    isEnabled: true,
    maxActiveWorkOrders: 5,
    notes: "Cobertura en Panamá Oeste.",
    coverage: [
      { provinceName: "Panamá Oeste", zoneName: "Arraiján" },
      { provinceName: "Panamá Oeste", zoneName: "La Chorrera" },
      { provinceName: "Panamá Oeste", zoneName: "Costa Verde" },
    ],
  },
  {
    email: "instalador.colon@mkbooking.com",
    name: "Luis Castillo",
    firstName: "Luis",
    lastName: "Castillo",
    password: defaultInstallerPassword,
    isEnabled: true,
    maxActiveWorkOrders: 3,
    notes: "Cobertura operativa para provincia de Colón.",
    coverage: [
      { provinceName: "Colón", zoneName: "Colón Centro" },
      { provinceName: "Colón", zoneName: "Sabanitas" },
    ],
  },
  {
    email: "instalador.chiriqui@mkbooking.com",
    name: "Ana Sánchez",
    firstName: "Ana",
    lastName: "Sánchez",
    password: defaultInstallerPassword,
    isEnabled: true,
    maxActiveWorkOrders: 2,
    notes: "Cobertura para Chiriquí y apoyo en Veraguas.",
    coverage: [
      { provinceName: "Chiriquí", zoneName: "David" },
      { provinceName: "Chiriquí", zoneName: "Boquete" },
      { provinceName: "Veraguas", zoneName: "Santiago" },
    ],
  },
];

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();
}

function provinceCode(value: string): string {
  const cleaned = slugify(value).replace(/[^a-z0-9]/g, "");
  return cleaned.slice(0, 3).toUpperCase();
}

function imageUrl(kind: string, name: string): string {
  return `https://picsum.photos/seed/${kind}-${slugify(name)}/900/700`;
}

function structureFlags(name: string) {
  const lower = name.toLowerCase();
  const digital = lower.includes("digital");
  const illuminated =
    digital ||
    lower.includes("mupi") ||
    lower.includes("parada") ||
    lower.includes("unipolar") ||
    lower.includes("valla");

  return {
    digital,
    illuminated,
    powered: digital || illuminated,
    hasPrintService: !digital,
  };
}

function sizeForStructure(name: string) {
  return structureSizes[name] || { width: 6.0, height: 3.0 };
}

function buildAddress(zone: string, roadType: string): string {
  return `Vía ${roadType}, ${zone}`;
}

function buildLandmark(zone: string, province: string): string {
  return `Cerca de ${zone}, ${province}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildZoneCoverageKey(provinceName: string, zoneName: string): string {
  return `${slugify(provinceName)}::${slugify(zoneName)}`;
}

async function upsertCredentialAccount(userId: string, password: string) {
  const passwordHash = await hashPassword(password);
  const now = new Date();
  const account = await prisma.account.findFirst({
    where: {
      userId,
      providerId: "credential",
    },
    select: {
      id: true,
    },
  });

  if (account) {
    await prisma.account.update({
      where: { id: account.id },
      data: {
        password: passwordHash,
        updatedAt: now,
      },
    });
    return;
  }

  await prisma.account.create({
    data: {
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    },
  });
}

async function upsertInstallerUsers(zones: ZoneWithProvince[]) {
  const zoneMap = new Map(
    zones.map((zone) => [
      buildZoneCoverageKey(zone.province.name, zone.name),
      zone.id,
    ]),
  );

  for (const installer of installerUsers) {
    const now = new Date();
    const user = await prisma.user.upsert({
      where: { email: normalizeEmail(installer.email) },
      update: {
        name: installer.name,
        emailVerified: true,
        updatedAt: now,
      },
      create: {
        id: crypto.randomUUID(),
        email: normalizeEmail(installer.email),
        name: installer.name,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      select: {
        id: true,
      },
    });

    await upsertCredentialAccount(user.id, installer.password);

    const profile = await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {
        systemRole: "INSTALLER",
        firstName: installer.firstName,
        lastName: installer.lastName,
        isActive: installer.isActive ?? true,
        isVerified: true,
      },
      create: {
        userId: user.id,
        systemRole: "INSTALLER",
        firstName: installer.firstName,
        lastName: installer.lastName,
        isActive: installer.isActive ?? true,
        isVerified: true,
      },
      select: {
        id: true,
      },
    });

    await prisma.installerConfig.upsert({
      where: { userProfileId: profile.id },
      update: {
        isEnabled: installer.isEnabled,
        maxActiveWorkOrders: installer.maxActiveWorkOrders,
        notes: installer.notes ?? null,
      },
      create: {
        userProfileId: profile.id,
        isEnabled: installer.isEnabled,
        maxActiveWorkOrders: installer.maxActiveWorkOrders,
        notes: installer.notes ?? null,
      },
    });

    const zoneIds = installer.coverage.map((coverage) => {
      const zoneId = zoneMap.get(
        buildZoneCoverageKey(coverage.provinceName, coverage.zoneName),
      );

      if (!zoneId) {
        throw new Error(
          `Coverage zone not found: ${coverage.provinceName} / ${coverage.zoneName}`,
        );
      }

      return zoneId;
    });

    await prisma.installerCoverageZone.deleteMany({
      where: { installerId: profile.id },
    });

    if (zoneIds.length > 0) {
      await prisma.installerCoverageZone.createMany({
        data: zoneIds.map((zoneId) => ({
          installerId: profile.id,
          zoneId,
        })),
        skipDuplicates: true,
      });
    }
  }
}

async function upsertSeedUser(input: SeedUserInput) {
  const now = new Date();
  const user = await prisma.user.upsert({
    where: { email: normalizeEmail(input.email) },
    update: {
      name: input.name,
      emailVerified: true,
      updatedAt: now,
    },
    create: {
      id: crypto.randomUUID(),
      email: normalizeEmail(input.email),
      name: input.name,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    select: {
      id: true,
    },
  });

  await upsertCredentialAccount(user.id, input.password);

  const profile = await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {
      systemRole: input.systemRole,
      accountType: input.accountType,
      firstName: input.firstName,
      lastName: input.lastName,
      isActive: input.isActive ?? true,
      isVerified: true,
    },
    create: {
      userId: user.id,
      systemRole: input.systemRole,
      accountType: input.accountType,
      firstName: input.firstName,
      lastName: input.lastName,
      isActive: input.isActive ?? true,
      isVerified: true,
    },
    select: {
      id: true,
    },
  });

  return {
    userId: user.id,
    profileId: profile.id,
  };
}

async function upsertSeedOrganization(input: SeedOrganizationInput) {
  return prisma.organization.upsert({
    where: { taxId: input.taxId },
    update: {
      name: input.name,
      legalName: input.legalName,
      tradeName: input.tradeName,
      organizationType: input.organizationType,
      legalEntityType: "LEGAL_ENTITY",
      taxId: input.taxId,
      email: input.email,
      phone: input.phone,
      industry: input.industry,
      isActive: true,
      isVerified: true,
      updatedBy: input.createdByProfileId,
    },
    create: {
      name: input.name,
      legalName: input.legalName,
      tradeName: input.tradeName,
      organizationType: input.organizationType,
      legalEntityType: "LEGAL_ENTITY",
      taxId: input.taxId,
      email: input.email,
      phone: input.phone,
      industry: input.industry,
      isActive: true,
      isVerified: true,
      createdById: input.createdByProfileId,
      updatedBy: input.createdByProfileId,
    },
    select: {
      id: true,
      name: true,
    },
  });
}

async function upsertOwnerMembership(organizationId: string, userProfileId: string) {
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userProfileId: {
        organizationId,
        userProfileId,
      },
    },
    update: {
      role: "OWNER",
      isActive: true,
      acceptedAt: new Date(),
      expiresAt: null,
    },
    create: {
      organizationId,
      userProfileId,
      role: "OWNER",
      isActive: true,
      acceptedAt: new Date(),
    },
  });
}

async function upsertSeedBrand(input: SeedBrandInput) {
  return prisma.brand.upsert({
    where: { taxId: input.taxId },
    update: {
      ownerOrganizationId: input.ownerOrganizationId,
      name: input.name,
      legalName: input.legalName,
      tradeName: input.tradeName,
      legalEntityType: "LEGAL_ENTITY",
      taxId: input.taxId,
      email: input.email,
      phone: input.phone,
      industry: input.industry,
      isActive: true,
      isVerified: true,
      updatedBy: input.createdByProfileId,
    },
    create: {
      ownerOrganizationId: input.ownerOrganizationId,
      name: input.name,
      legalName: input.legalName,
      tradeName: input.tradeName,
      legalEntityType: "LEGAL_ENTITY",
      taxId: input.taxId,
      email: input.email,
      phone: input.phone,
      industry: input.industry,
      isActive: true,
      isVerified: true,
      createdBy: input.createdByProfileId,
      updatedBy: input.createdByProfileId,
    },
    select: {
      id: true,
    },
  });
}

async function upsertOwnerBrandAccess(
  organizationId: string,
  brandId: string,
  actorProfileId: string,
) {
  await prisma.brandAccess.upsert({
    where: {
      organizationId_brandId: {
        organizationId,
        brandId,
      },
    },
    update: {
      accessType: "OWNER",
      status: "ACTIVE",
      canCreateRequests: true,
      canCreateOrders: true,
      canViewBilling: true,
      canManageContacts: true,
      updatedBy: actorProfileId,
    },
    create: {
      organizationId,
      brandId,
      accessType: "OWNER",
      status: "ACTIVE",
      canCreateRequests: true,
      canCreateOrders: true,
      canViewBilling: true,
      canManageContacts: true,
      createdBy: actorProfileId,
      updatedBy: actorProfileId,
    },
  });
}

async function upsertDelegatedBrandAccess(
  organizationId: string,
  brandId: string,
  actorProfileId: string,
) {
  await prisma.brandAccess.upsert({
    where: {
      organizationId_brandId: {
        organizationId,
        brandId,
      },
    },
    update: {
      accessType: "DELEGATED",
      status: "ACTIVE",
      canCreateRequests: true,
      canCreateOrders: true,
      canViewBilling: false,
      canManageContacts: false,
      updatedBy: actorProfileId,
    },
    create: {
      organizationId,
      brandId,
      accessType: "DELEGATED",
      status: "ACTIVE",
      canCreateRequests: true,
      canCreateOrders: true,
      canViewBilling: false,
      canManageContacts: false,
      createdBy: actorProfileId,
      updatedBy: actorProfileId,
    },
  });
}

async function upsertB2BCommercialAndStaffSeed() {
  for (const internalUser of platformInternalUsers) {
    await upsertSeedUser(internalUser);
  }

  const agenciesByKey = new Map<
    string,
    { organizationId: string; ownerProfileId: string }
  >();
  for (const agency of seedAgencies) {
    const owner = await upsertSeedUser({
      ...agency.ownerUser,
      password: seedB2BPassword,
      systemRole: "CUSTOMER",
      accountType: "AGENCY",
    });

    const organization = await upsertSeedOrganization({
      name: agency.name,
      legalName: agency.legalName,
      tradeName: agency.tradeName,
      organizationType: "AGENCY",
      taxId: agency.taxId,
      email: agency.email,
      phone: agency.phone,
      industry: agency.industry,
      createdByProfileId: owner.profileId,
    });

    await upsertOwnerMembership(organization.id, owner.profileId);
    agenciesByKey.set(agency.key, {
      organizationId: organization.id,
      ownerProfileId: owner.profileId,
    });
  }

  const clientBrandsByKey = new Map<
    string,
    { brandId: string; organizationId: string; ownerProfileId: string }
  >();
  for (const client of seedDirectClients) {
    const owner = await upsertSeedUser({
      ...client.ownerUser,
      password: seedB2BPassword,
      systemRole: "CUSTOMER",
      accountType: "DIRECT_CLIENT",
    });

    const organization = await upsertSeedOrganization({
      name: client.name,
      legalName: client.legalName,
      tradeName: client.tradeName,
      organizationType: "DIRECT_CLIENT",
      taxId: client.taxId,
      email: client.email,
      phone: client.phone,
      industry: client.industry,
      createdByProfileId: owner.profileId,
    });

    await upsertOwnerMembership(organization.id, owner.profileId);

    const brand = await upsertSeedBrand({
      ownerOrganizationId: organization.id,
      name: client.brand.name,
      legalName: client.brand.legalName,
      tradeName: client.brand.tradeName,
      taxId: client.brand.taxId,
      email: client.brand.email,
      phone: client.brand.phone,
      industry: client.brand.industry,
      createdByProfileId: owner.profileId,
    });

    await upsertOwnerBrandAccess(organization.id, brand.id, owner.profileId);
    clientBrandsByKey.set(client.key, {
      brandId: brand.id,
      organizationId: organization.id,
      ownerProfileId: owner.profileId,
    });
  }

  for (const distribution of agencyBrandDistribution) {
    const agency = agenciesByKey.get(distribution.agencyKey);
    if (!agency) {
      throw new Error(`Agency key not found in seed distribution: ${distribution.agencyKey}`);
    }

    for (const clientKey of distribution.clientKeys) {
      const client = clientBrandsByKey.get(clientKey);
      if (!client) {
        throw new Error(`Client key not found in seed distribution: ${clientKey}`);
      }

      await upsertDelegatedBrandAccess(
        agency.organizationId,
        client.brandId,
        agency.ownerProfileId,
      );
    }
  }
}

async function upsertProvinces() {
  for (const province of provinceZones) {
    await prisma.province.upsert({
      where: { name: province.name },
      update: {},
      create: { name: province.name },
    });
  }
}

async function upsertZones(provinceMap: Map<string, string>) {
  const zonesToCreate = [];

  for (const province of provinceZones) {
    const provinceId = provinceMap.get(province.name);
    if (!provinceId) continue;

    for (const zoneName of province.zones) {
      zonesToCreate.push({
        name: zoneName,
        provinceId,
        imageUrl: imageUrl("zone", `${province.name}-${zoneName}`),
      });
    }
  }

  // Batch insert
  await prisma.zone.createMany({
    data: zonesToCreate,
    skipDuplicates: true,
  });
}

async function upsertSimpleList(
  model: any,
  items: string[],
  mapFn: (item: string) => any,
) {
  for (const item of items) {
    const data = mapFn(item);
    await model.upsert({
      where: { name: data.name },
      update: data,
      create: data,
    });
  }
}

async function upsertRestrictionTags() {
  for (const tag of restrictionTags) {
    await prisma.restrictionTag.upsert({
      where: { code: tag.code },
      update: { label: tag.label },
      create: tag,
    });
  }
}

function buildAssets({ zones, structureTypesList, roadTypesList }: any) {
  return zones.map((zone: any, index: number) => {
    const structureType = structureTypesList[index % structureTypesList.length];
    const roadType = roadTypesList[index % roadTypesList.length];
    const code = `PA-${provinceCode(zone.province.name)}-${String(index + 1).padStart(3, "0")}`;
    const flags = structureFlags(structureType.name);
    const status =
      index % 15 === 0
        ? "MAINTENANCE"
        : index % 11 === 0
          ? "INACTIVE"
          : "ACTIVE";

    const baseLat = 7.9 + (index % 6) * 0.18;
    const baseLng = -80.4 - (index % 6) * 0.22;

    return {
      code,
      structureTypeId: structureType.id,
      zoneId: zone.id,
      roadTypeId: roadType.id,
      address: buildAddress(zone.name, roadType.name),
      landmark: buildLandmark(zone.name, zone.province.name),
      latitude: Number(baseLat.toFixed(6)),
      longitude: Number(baseLng.toFixed(6)),
      illuminated: flags.illuminated,
      digital: flags.digital,
      powered: flags.powered,
      hasPrintService: flags.hasPrintService,
      status,
      notes:
        index % 7 === 0 ? "Inventario demo - revisar antes de cotizar" : null,
      installedDate: new Date(2020, (index % 12) + 1, (index % 26) + 1),
    };
  });
}

async function upsertAssets(assets: any[]) {
  // Procesar en batches para reducir memoria
  for (let i = 0; i < assets.length; i += BATCH_SIZE) {
    const batch = assets.slice(i, i + BATCH_SIZE);
    await prisma.asset.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }
}

function buildFaces({ assets, positions }: any) {
  const faces: any[] = [];

  assets.forEach((asset: any, index: number) => {
    const { width, height } = sizeForStructure(asset.structureType.name);
    const faceCount = asset.digital ? 1 : index % 4 === 0 ? 2 : 1;

    for (let i = 0; i < faceCount; i += 1) {
      const code = String.fromCharCode(65 + i);
      const position = positions[(index + i) % positions.length];
      faces.push({
        assetId: asset.id,
        code,
        positionId: position?.id || null,
        width,
        height,
        facing: i === 1 ? "OPPOSITE_TRAFFIC" : "TRAFFIC",
        visibilityNotes:
          i === 0
            ? "Alta exposición en vía principal"
            : "Visibilidad media en retorno",
        status: "ACTIVE",
        restrictions: null,
        notes: index % 6 === 0 ? "Evitar material reflectivo" : null,
      });
    }
  });

  return faces;
}

async function upsertFaces(faces: any[]) {
  // Procesar en batches
  for (let i = 0; i < faces.length; i += BATCH_SIZE) {
    const batch = faces.slice(i, i + BATCH_SIZE);
    await prisma.assetFace.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }
}

async function upsertCatalogFaces(faces: any[]) {
  for (const [index, face] of faces.entries()) {
    const title = `${face.asset.structureType.name} · ${face.asset.zone.name} ${face.code}`;
    const summary = `Ubicación estratégica en ${face.asset.zone.name}, ${face.asset.zone.province.name}.`;
    const highlight = index % 7 === 0 ? "Alta visibilidad" : null;
    const primaryImageUrl =
      index % 2 === 0
        ? imageUrl("face", `${face.asset.code}-${face.code}`)
        : null;

    await prisma.catalogFace.upsert({
      where: { faceId: face.id },
      update: {
        title,
        summary,
        highlight,
        primaryImageUrl,
        isPublished: true,
      },
      create: {
        faceId: face.id,
        title,
        summary,
        highlight,
        primaryImageUrl,
        isPublished: true,
      },
    });
  }
}

async function upsertCatalogPriceRules(
  structureTypesList: any[],
  zones: any[],
) {
  await prisma.catalogPriceRule.upsert({
    where: { id: "seed-global-price" },
    update: {
      priceDaily: 75,
      currency: "USD",
      isActive: true,
    },
    create: {
      id: "seed-global-price",
      priceDaily: 75,
      currency: "USD",
      startDate: new Date(2024, 0, 1),
      isActive: true,
    },
  });

  for (const structure of structureTypesList) {
    const price = structureBasePrice[structure.name] || 120;
    await prisma.catalogPriceRule.upsert({
      where: { id: `seed-structure-${structure.id}` },
      update: {
        structureTypeId: structure.id,
        priceDaily: price,
        currency: "USD",
        isActive: true,
      },
      create: {
        id: `seed-structure-${structure.id}`,
        structureTypeId: structure.id,
        priceDaily: price,
        currency: "USD",
        startDate: new Date(2024, 0, 1),
        isActive: true,
      },
    });
  }

  const premiumZones = zones.filter((zone) =>
    [
      "Brisas del Golf",
      "Costa Verde",
      "David",
      "Boquete",
      "Avenida Central",
      "Santiago",
    ].includes(zone.name),
  );

  for (const zone of premiumZones) {
    await prisma.catalogPriceRule.upsert({
      where: { id: `seed-zone-${zone.id}` },
      update: {
        zoneId: zone.id,
        priceDaily: 180,
        currency: "USD",
        isActive: true,
      },
      create: {
        id: `seed-zone-${zone.id}`,
        zoneId: zone.id,
        priceDaily: 180,
        currency: "USD",
        startDate: new Date(2024, 0, 1),
        isActive: true,
      },
    });
  }
}

async function upsertPromo() {
  await prisma.catalogPromo.upsert({
    where: { id: "seed-promo-panama" },
    update: {
      name: "Lanzamiento Panamá",
      type: "PERCENT",
      value: 10,
      isActive: true,
    },
    create: {
      id: "seed-promo-panama",
      name: "Lanzamiento Panamá",
      type: "PERCENT",
      value: 10,
      startDate: new Date(2024, 10, 1),
      isActive: true,
    },
  });
}

async function upsertCampaignServices() {
  for (const service of campaignServices) {
    await prisma.campaignService.upsert({
      where: { code: service.code },
      update: {
        name: service.name,
        description: service.description,
        basePrice: service.basePrice,
        currency: service.currency,
        sortOrder: service.sortOrder,
        isActive: true,
      },
      create: {
        code: service.code,
        name: service.name,
        description: service.description,
        basePrice: service.basePrice,
        currency: service.currency,
        sortOrder: service.sortOrder,
        isActive: true,
      },
    });
  }
}

async function upsertProductionSpecs(faces: any[], mountingTypeList: any[]) {
  for (const [index, face] of faces.entries()) {
    const isDigital = face.asset.digital;
    const mountingType = mountingTypeList[index % mountingTypeList.length];

    await prisma.productionSpec.upsert({
      where: { faceId: face.id },
      update: {
        mountingTypeId: mountingType?.id || null,
        material: isDigital ? "LED" : "Lona Frontlit",
        bleedCm: isDigital ? null : 5,
        safeMarginCm: isDigital ? null : 10,
        dpiRecommended: isDigital ? 72 : 150,
        fileFormat: isDigital ? "MP4 / JPG" : "PDF / AI / EPS",
        installNotes: isDigital
          ? "Programar contenido con 48h de anticipación."
          : "Instalar en horario nocturno con equipo certificado.",
        uninstallNotes: isDigital
          ? "Retirar programación al cierre del contrato."
          : "Retiro con soporte municipal presente.",
      },
      create: {
        faceId: face.id,
        mountingTypeId: mountingType?.id || null,
        material: isDigital ? "LED" : "Lona Frontlit",
        bleedCm: isDigital ? null : 5,
        safeMarginCm: isDigital ? null : 10,
        dpiRecommended: isDigital ? 72 : 150,
        fileFormat: isDigital ? "MP4 / JPG" : "PDF / AI / EPS",
        installNotes: isDigital
          ? "Programar contenido con 48h de anticipación."
          : "Instalar en horario nocturno con equipo certificado.",
        uninstallNotes: isDigital
          ? "Retirar programación al cierre del contrato."
          : "Retiro con soporte municipal presente.",
      },
    });
  }
}

async function upsertAssetsImages(assets: any[]) {
  for (const asset of assets) {
    const id = `seed-asset-image-${asset.id}`;
    await prisma.assetImage.upsert({
      where: { id },
      update: {
        image: imageUrl("asset", asset.code),
        caption: `Vista general de ${asset.code}`,
        isPrimary: true,
      },
      create: {
        id,
        assetId: asset.id,
        image: imageUrl("asset", asset.code),
        caption: `Vista general de ${asset.code}`,
        isPrimary: true,
      },
    });
  }
}

async function upsertFaceImages(faces: any[]) {
  for (const face of faces) {
    const id = `seed-face-image-${face.id}`;
    await prisma.assetFaceImage.upsert({
      where: { id },
      update: {
        image: imageUrl("face", `${face.asset.code}-${face.code}`),
        caption: `Cara ${face.code} del activo ${face.asset.code}`,
        isPrimary: true,
      },
      create: {
        id,
        faceId: face.id,
        image: imageUrl("face", `${face.asset.code}-${face.code}`),
        caption: `Cara ${face.code} del activo ${face.asset.code}`,
        isPrimary: true,
      },
    });
  }
}

async function upsertPermits(assets: any[]) {
  for (const [index, asset] of assets.entries()) {
    if (index % 3 !== 0) continue;
    const id = `seed-permit-${asset.id}`;

    await prisma.permit.upsert({
      where: { id },
      update: {
        permitNumber: `MOP-${2025}-${String(index + 1).padStart(3, "0")}`,
        authority: "Municipio de Panamá",
        issuedDate: new Date(2023, 2, 1),
        expiresDate: new Date(2026, 2, 1),
        notes: "Permiso demo vigente.",
      },
      create: {
        id,
        assetId: asset.id,
        permitNumber: `MOP-${2025}-${String(index + 1).padStart(3, "0")}`,
        authority: "Municipio de Panamá",
        issuedDate: new Date(2023, 2, 1),
        expiresDate: new Date(2026, 2, 1),
        notes: "Permiso demo vigente.",
      },
    });
  }
}

async function upsertMaintenance(assets: any[]) {
  for (const [index, asset] of assets.entries()) {
    if (index % 5 !== 0) continue;
    const id = `seed-maint-${asset.id}`;
    const start = new Date(2025, 6, 5 + index);
    const end = new Date(2025, 6, 12 + index);

    await prisma.maintenanceWindow.upsert({
      where: { id },
      update: {
        startDate: start,
        endDate: end,
        reason: "Mantenimiento preventivo",
        notes: "Revisión de iluminación y estructura.",
      },
      create: {
        id,
        assetId: asset.id,
        startDate: start,
        endDate: end,
        reason: "Mantenimiento preventivo",
        notes: "Revisión de iluminación y estructura.",
      },
    });
  }
}

async function upsertFaceRestrictions(faces: any[], tags: any[]) {
  const restrictions = faces
    .map((face, index) => {
      const tag = tags[index % tags.length];
      return tag
        ? {
            faceId: face.id,
            tagId: tag.id,
          }
        : null;
    })
    .filter((item): item is { faceId: string; tagId: string } => item !== null);

  if (restrictions.length === 0) return;

  await prisma.assetFaceRestriction.createMany({
    data: restrictions,
    skipDuplicates: true,
  });
}

async function main() {
  console.log("Seeding taxonomy...");
  await upsertProvinces();

  const provinces = await prisma.province.findMany({
    where: { name: { in: provinceZones.map((item) => item.name) } },
  });
  const provinceMap = new Map(
    provinces.map((province) => [province.name, province.id]),
  );

  await upsertZones(provinceMap);

  await upsertSimpleList(prisma.structureType, structureTypes, (name) => ({
    name,
    imageUrl: imageUrl("structure", name),
  }));
  await upsertSimpleList(prisma.roadType, roadTypes, (name) => ({ name }));
  await upsertSimpleList(prisma.facePosition, facePositions, (name) => ({
    name,
  }));
  await upsertSimpleList(prisma.mountingType, mountingTypes, (name) => ({
    name,
  }));
  await upsertRestrictionTags();

  console.log("Seeding B2B accounts and brand relationships...");
  await upsertB2BCommercialAndStaffSeed();

  const zones = await prisma.zone.findMany({
    where: { provinceId: { in: provinces.map((province) => province.id) } },
    include: { province: true },
    orderBy: [{ province: { name: "asc" } }, { name: "asc" }],
  });

  console.log("Seeding installer users...");
  await upsertInstallerUsers(zones);

  const structureTypesList = await prisma.structureType.findMany({
    where: { name: { in: structureTypes } },
    orderBy: { name: "asc" },
  });
  const roadTypesList = await prisma.roadType.findMany({
    where: { name: { in: roadTypes } },
    orderBy: { name: "asc" },
  });
  const positions = await prisma.facePosition.findMany({
    where: { name: { in: facePositions } },
    orderBy: { name: "asc" },
  });
  const mountingTypeList = await prisma.mountingType.findMany({
    where: { name: { in: mountingTypes } },
    orderBy: { name: "asc" },
  });
  const tags = await prisma.restrictionTag.findMany({
    where: { code: { in: restrictionTags.map((tag) => tag.code) } },
    orderBy: { code: "asc" },
  });

  console.log("Seeding assets...");
  const assetSeeds = buildAssets({ zones, structureTypesList, roadTypesList });
  await upsertAssets(assetSeeds);

  // Solo cargar IDs necesarios, no relaciones completas
  const seededAssets = await prisma.asset.findMany({
    where: { code: { in: assetSeeds.map((asset: any) => asset.code) } },
    select: {
      id: true,
      code: true,
      digital: true,
      structureType: { select: { id: true, name: true } },
      zone: {
        select: { id: true, name: true, province: { select: { name: true } } },
      },
    },
    orderBy: { code: "asc" },
  });

  console.log("Seeding faces...");
  const faceSeeds = buildFaces({ assets: seededAssets, positions });
  await upsertFaces(faceSeeds);

  const seededFaces = await prisma.assetFace.findMany({
    where: { assetId: { in: seededAssets.map((asset: any) => asset.id) } },
    include: {
      asset: {
        include: {
          structureType: true,
          zone: { include: { province: true } },
        },
      },
    },
    orderBy: [{ asset: { code: "asc" } }, { code: "asc" }],
  });

  console.log("Seeding catalog...");
  await upsertCatalogFaces(seededFaces);
  await upsertCatalogPriceRules(structureTypesList, zones);
  await upsertPromo();
  await upsertCampaignServices();

  console.log("Seeding specs and extras...");
  await upsertProductionSpecs(seededFaces, mountingTypeList);
  await upsertAssetsImages(seededAssets);
  await upsertFaceImages(seededFaces);
  await upsertPermits(seededAssets);
  await upsertMaintenance(seededAssets);
  await upsertFaceRestrictions(seededFaces, tags);

  console.log("Seed completed.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
