import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
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

  const zones = await prisma.zone.findMany({
    where: { provinceId: { in: provinces.map((province) => province.id) } },
    include: { province: true },
    orderBy: [{ province: { name: "asc" } }, { name: "asc" }],
  });
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
