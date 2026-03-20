import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import QRCode from "qrcode";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatFaceDimensions, formatPrice } from "@/lib/formatters/catalog-face";
import { getGoogleMapsStaticApiKey, getPublicAppUrl } from "@/lib/server-config";
import {
  resolveCatalogFaceImageUrl,
  resolveEffectivePriceRuleMapForFaces,
} from "@/lib/services/catalog";

const BRAND_BLUE = rgb(0.012, 0.349, 0.659);
const WHITE = rgb(1, 1, 1);
const TEXT_SECONDARY = rgb(0.24, 0.24, 0.24);
const TEXT_MUTED = rgb(0.43, 0.43, 0.43);

const PAGE_WIDTH = 595.28; // A4 portrait
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN_X = 26;
const PAGE_MARGIN_TOP = 28;
const PAGE_MARGIN_BOTTOM = 28;

interface TechnicalSheetGenerationInput {
  faceIds: string[];
  brandId?: string;
  includeCommercialData: boolean;
}

export interface TechnicalSheetGenerationResult {
  fileName: string;
  includedFaceIds: string[];
  pdfBytes: Uint8Array;
  skippedFaceIds: string[];
}

type TechnicalFaceRecord = Prisma.AssetFaceGetPayload<{
  include: {
    asset: {
      include: {
        images: true;
        roadType: true;
        structureType: true;
        zone: { include: { province: true } };
      };
    };
    catalogFace: {
      include: {
        holds: true;
      };
    };
    images: true;
    productionSpec: {
      include: {
        mountingType: true;
      };
    };
  };
}>;

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("es-PA", {
    maximumFractionDigits,
  }).format(value);
}

function formatDateForFileName(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  const hour = `${value.getHours()}`.padStart(2, "0");
  const minute = `${value.getMinutes()}`.padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}`;
}

function facingLabel(value: string) {
  return value === "OPPOSITE_TRAFFIC" ? "Contraflujo" : "Circulación";
}

function sanitizeFaceIds(faceIds: string[]) {
  const uniqueIds: string[] = [];
  const seen = new Set<string>();
  for (const rawId of faceIds) {
    const trimmedId = rawId.trim();
    if (!trimmedId || seen.has(trimmedId)) {
      continue;
    }
    seen.add(trimmedId);
    uniqueIds.push(trimmedId);
  }
  return uniqueIds;
}

function buildMapsUrl(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) {
    return null;
  }
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

function buildStaticMapUrl(
  latitude: number | null,
  longitude: number | null,
  apiKey: string | null,
) {
  if (latitude === null || longitude === null || !apiKey) {
    return null;
  }

  const params = new URLSearchParams({
    center: `${latitude},${longitude}`,
    key: apiKey,
    maptype: "roadmap",
    size: "640x360",
    zoom: "16",
  });
  params.append("markers", `color:red|${latitude},${longitude}`);
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

function wrapText({
  font,
  fontSize,
  maxWidth,
  text,
}: {
  font: PDFFont;
  fontSize: number;
  maxWidth: number;
  text: string;
}) {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  if (!normalizedText) {
    return ["N/D"];
  }

  const words = normalizedText.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const trialLine = currentLine ? `${currentLine} ${word}` : word;
    const trialWidth = font.widthOfTextAtSize(trialLine, fontSize);
    if (trialWidth <= maxWidth || !currentLine) {
      currentLine = trialLine;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function drawSectionBlock({
  bodyFont,
  lines,
  page,
  title,
  titleFont,
  width,
  x,
  yTop,
}: {
  bodyFont: PDFFont;
  lines: string[];
  page: PDFPage;
  title: string;
  titleFont: PDFFont;
  width: number;
  x: number;
  yTop: number;
}) {
  const titleHeight = 20;
  const paddingX = 9;
  const paddingBottom = 10;
  const lineHeight = 12.5;
  const bodyFontSize = 9.2;
  const wrappedLines = lines.flatMap((line) =>
    wrapText({
      font: bodyFont,
      fontSize: bodyFontSize,
      maxWidth: width - paddingX * 2 - 10,
      text: line,
    }),
  );
  const bodyHeight = wrappedLines.length * lineHeight + 8 + paddingBottom;
  const totalHeight = titleHeight + bodyHeight;
  const yBottom = yTop - totalHeight;

  page.drawRectangle({
    color: rgb(0.964, 0.968, 0.972),
    height: totalHeight,
    width,
    x,
    y: yBottom,
  });

  page.drawRectangle({
    color: BRAND_BLUE,
    height: titleHeight,
    width,
    x,
    y: yTop - titleHeight,
  });

  page.drawText(title.toUpperCase(), {
    color: WHITE,
    font: titleFont,
    size: 10,
    x: x + paddingX,
    y: yTop - titleHeight + 6,
  });

  let currentY = yTop - titleHeight - 10;
  for (const line of wrappedLines) {
    page.drawText(`• ${line}`, {
      color: TEXT_SECONDARY,
      font: bodyFont,
      size: bodyFontSize,
      x: x + paddingX,
      y: currentY,
    });
    currentY -= lineHeight;
  }

  return yBottom;
}

async function readLocalImageBytes(filePath: string) {
  try {
    return new Uint8Array(await readFile(filePath));
  } catch {
    return null;
  }
}

async function fetchImageBytes(
  url: string,
  imageCache: Map<string, Promise<Uint8Array | null>>,
) {
  const existing = imageCache.get(url);
  if (existing) {
    return existing;
  }

  const pendingFetch = (async () => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        return null;
      }
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } catch {
      return null;
    }
  })();

  imageCache.set(url, pendingFetch);
  return pendingFetch;
}

async function fetchQrPngBytes(
  value: string,
  qrCache: Map<string, Promise<Uint8Array | null>>,
) {
  const existing = qrCache.get(value);
  if (existing) {
    return existing;
  }

  const pendingQr = (async () => {
    try {
      const qrDataUrl = await QRCode.toDataURL(value, {
        color: {
          dark: "#0359A8",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "M",
        margin: 1,
        width: 220,
      });
      const commaIndex = qrDataUrl.indexOf(",");
      if (commaIndex === -1) {
        return null;
      }
      const base64Payload = qrDataUrl.slice(commaIndex + 1);
      return Uint8Array.from(Buffer.from(base64Payload, "base64"));
    } catch {
      return null;
    }
  })();

  qrCache.set(value, pendingQr);
  return pendingQr;
}

async function embedImageFromBytes(pdfDocument: PDFDocument, bytes: Uint8Array | null) {
  if (!bytes) {
    return null;
  }

  try {
    return await pdfDocument.embedJpg(bytes);
  } catch {
    // Fall back to PNG when the binary is not JPG.
  }

  try {
    return await pdfDocument.embedPng(bytes);
  } catch {
    return null;
  }
}

function drawImageBox({
  fallbackText,
  image,
  page,
  x,
  yBottom,
  yTop,
  width,
}: {
  fallbackText: string;
  image: PDFImage | null;
  page: PDFPage;
  width: number;
  x: number;
  yBottom: number;
  yTop: number;
}) {
  const height = yTop - yBottom;
  page.drawRectangle({
    borderColor: rgb(0.8, 0.84, 0.88),
    borderWidth: 0.8,
    color: rgb(0.955, 0.963, 0.972),
    height,
    width,
    x,
    y: yBottom,
  });

  if (!image) {
    page.drawText(fallbackText, {
      color: TEXT_MUTED,
      size: 10,
      x: x + 10,
      y: yBottom + height / 2 - 5,
    });
    return;
  }

  const imageScale = Math.min(width / image.width, height / image.height);
  const renderedWidth = image.width * imageScale;
  const renderedHeight = image.height * imageScale;
  page.drawImage(image, {
    height: renderedHeight,
    width: renderedWidth,
    x: x + (width - renderedWidth) / 2,
    y: yBottom + (height - renderedHeight) / 2,
  });
}

async function listTechnicalSheetFaces(faceIds: string[]) {
  const now = new Date();
  return db.assetFace.findMany({
    include: {
      asset: {
        include: {
          images: {
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          },
          roadType: true,
          structureType: true,
          zone: {
            include: {
              province: true,
            },
          },
        },
      },
      catalogFace: {
        include: {
          holds: {
            orderBy: {
              expiresAt: "asc",
            },
            where: {
              expiresAt: { gte: now },
              status: "ACTIVE",
            },
          },
        },
      },
      images: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      productionSpec: {
        include: {
          mountingType: true,
        },
      },
    },
    where: {
      catalogFace: {
        isPublished: true,
      },
      id: { in: faceIds },
    },
  });
}

export async function generateTechnicalSheetsPdf({
  brandId,
  faceIds,
  includeCommercialData,
}: TechnicalSheetGenerationInput): Promise<TechnicalSheetGenerationResult> {
  const normalizedFaceIds = sanitizeFaceIds(faceIds);
  if (normalizedFaceIds.length === 0) {
    return {
      fileName: `fichas-tecnicas-${formatDateForFileName(new Date())}.pdf`,
      includedFaceIds: [],
      pdfBytes: new Uint8Array(),
      skippedFaceIds: [],
    };
  }

  const rawFaces = await listTechnicalSheetFaces(normalizedFaceIds);
  const facesById = new Map(rawFaces.map((face) => [face.id, face]));
  const orderedFaces = normalizedFaceIds
    .map((faceId) => facesById.get(faceId))
    .filter((face): face is TechnicalFaceRecord => Boolean(face));
  const skippedFaceIds = normalizedFaceIds.filter((faceId) => !facesById.has(faceId));

  if (orderedFaces.length === 0) {
    return {
      fileName: `fichas-tecnicas-${formatDateForFileName(new Date())}.pdf`,
      includedFaceIds: [],
      pdfBytes: new Uint8Array(),
      skippedFaceIds,
    };
  }

  const pricingMap = await resolveEffectivePriceRuleMapForFaces(
    orderedFaces.map((face) => ({
      asset: {
        structureTypeId: face.asset.structureTypeId,
        zoneId: face.asset.zoneId,
      },
      id: face.id,
    })),
    brandId,
  );

  const pdfDocument = await PDFDocument.create();
  const [headingFont, bodyFont] = await Promise.all([
    pdfDocument.embedFont(StandardFonts.HelveticaBold),
    pdfDocument.embedFont(StandardFonts.Helvetica),
  ]);
  const imageCache = new Map<string, Promise<Uint8Array | null>>();
  const qrCache = new Map<string, Promise<Uint8Array | null>>();
  const staticMapsApiKey = getGoogleMapsStaticApiKey();
  const publicAppUrl = getPublicAppUrl();
  const logoPath = path.join(process.cwd(), "public", "images", "logo", "b-mkm-white.png");
  const logoBytes = await readLocalImageBytes(logoPath);
  const logoImage = await embedImageFromBytes(pdfDocument, logoBytes);

  for (const face of orderedFaces) {
    const page = pdfDocument.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const faceImageUrl = resolveCatalogFaceImageUrl(face);
    const faceImageBytes = faceImageUrl
      ? await fetchImageBytes(faceImageUrl, imageCache)
      : null;
    const faceImage = await embedImageFromBytes(pdfDocument, faceImageBytes);
    const itemUrl = `${publicAppUrl}/faces/${face.id}`;
    const qrBytes = await fetchQrPngBytes(itemUrl, qrCache);
    const qrImage = await embedImageFromBytes(pdfDocument, qrBytes);

    const latitude = toFiniteNumber(face.asset.latitude);
    const longitude = toFiniteNumber(face.asset.longitude);
    const mapsUrl = buildMapsUrl(latitude, longitude);
    const staticMapUrl = buildStaticMapUrl(latitude, longitude, staticMapsApiKey);
    const staticMapBytes = staticMapUrl
      ? await fetchImageBytes(staticMapUrl, imageCache)
      : null;
    const staticMapImage = await embedImageFromBytes(pdfDocument, staticMapBytes);

    const title =
      face.catalogFace?.title ||
      `${face.asset.structureType.name} · Cara ${face.code}`;
    const faceCode = `${face.asset.code}-${face.code}`;
    const dimensions = formatFaceDimensions(face.width, face.height);
    const widthValue = toFiniteNumber(face.width);
    const heightValue = toFiniteNumber(face.height);
    const orientation =
      widthValue === null || heightValue === null
        ? "N/D"
        : heightValue > widthValue
          ? "Vertical"
          : widthValue > heightValue
            ? "Horizontal"
            : "Cuadrado";
    const widthCm = widthValue === null ? null : widthValue * 100;
    const heightCm = heightValue === null ? null : heightValue * 100;
    const effectivePriceRule = pricingMap.get(face.id) ?? null;
    const dailyRate = includeCommercialData
      ? effectivePriceRule
        ? formatPrice(
            Number(effectivePriceRule.priceDaily),
            effectivePriceRule.currency ?? "USD",
          )
        : "N/D"
      : "Requiere sesión";
    const dailyNumericRate = effectivePriceRule
      ? Number(effectivePriceRule.priceDaily)
      : null;
    const monthlyRate =
      includeCommercialData && dailyNumericRate !== null
        ? formatPrice(dailyNumericRate * 30, effectivePriceRule?.currency ?? "USD")
        : includeCommercialData
          ? "N/D"
          : "Requiere sesión";
    const productionMonthly =
      includeCommercialData && face.productionCostMonthly
        ? formatPrice(Number(face.productionCostMonthly), "USD")
        : includeCommercialData
          ? "N/D"
          : "Requiere sesión";
    const activeHolds = face.catalogFace?.holds.length ?? 0;

    const headerHeight = 86;
    const headerYBottom = PAGE_HEIGHT - PAGE_MARGIN_TOP - headerHeight;
    page.drawRectangle({
      color: BRAND_BLUE,
      height: headerHeight,
      width: PAGE_WIDTH - PAGE_MARGIN_X * 2,
      x: PAGE_MARGIN_X,
      y: headerYBottom,
    });
    page.drawText("FICHA TÉCNICA", {
      color: WHITE,
      font: headingFont,
      size: 30,
      x: PAGE_MARGIN_X + 14,
      y: headerYBottom + 48,
    });
    page.drawText(face.asset.structureType.name.toUpperCase(), {
      color: WHITE,
      font: bodyFont,
      size: 18,
      x: PAGE_MARGIN_X + 14,
      y: headerYBottom + 20,
    });
    if (logoImage) {
      const logoScale = Math.min(180 / logoImage.width, 52 / logoImage.height);
      const logoWidth = logoImage.width * logoScale;
      const logoHeight = logoImage.height * logoScale;
      page.drawImage(logoImage, {
        height: logoHeight,
        width: logoWidth,
        x: PAGE_WIDTH - PAGE_MARGIN_X - logoWidth - 16,
        y: headerYBottom + (headerHeight - logoHeight) / 2,
      });
    } else {
      page.drawText("MK MEDIA", {
        color: WHITE,
        font: headingFont,
        size: 24,
        x: PAGE_WIDTH - PAGE_MARGIN_X - 150,
        y: headerYBottom + 30,
      });
    }

    const bodyTop = headerYBottom - 14;
    const bodyBottom = PAGE_MARGIN_BOTTOM;
    const leftColumnWidth = 318;
    const rightColumnWidth =
      PAGE_WIDTH - PAGE_MARGIN_X * 2 - leftColumnWidth - 18;
    const leftX = PAGE_MARGIN_X;
    const rightX = leftX + leftColumnWidth + 18;

    const generalInfoLines = [
      `Nombre: ${title}`,
      `Código: ${faceCode}`,
      `Ubicación: ${face.asset.address || "N/D"}`,
      `Zona: ${face.asset.zone.name}, ${face.asset.zone.province.name}`,
      `Referencia: ${face.asset.landmark || "N/D"}`,
      `Coordenadas: ${
        latitude !== null && longitude !== null
          ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          : "N/D"
      }`,
      `Sentido de circulación: ${facingLabel(face.facing)}`,
    ];

    const technicalInfoLines = [
      `Dimensiones: ${dimensions?.label ?? "N/D"}`,
      `Formato: ${orientation}`,
      `Tipo de impresión: ${face.productionSpec?.material || "N/D"}`,
      `Iluminación: ${face.asset.illuminated ? "Iluminado" : "Sin iluminación"}`,
      `Montaje: ${face.productionSpec?.mountingType?.name || "N/D"}`,
      `Tipo de vía: ${face.asset.roadType?.name || "N/D"}`,
    ];

    const totalTraffic =
      (face.asset.vehicleTrafficMonthly ?? 0) +
      (face.asset.pedestrianTrafficMonthly ?? 0);
    const audienceInfoLines = [
      `Impactos vehiculares mensuales: ${
        face.asset.vehicleTrafficMonthly !== null
          ? formatNumber(face.asset.vehicleTrafficMonthly)
          : "N/D"
      }`,
      `Alcance peatonal mensual: ${
        face.asset.pedestrianTrafficMonthly !== null
          ? formatNumber(face.asset.pedestrianTrafficMonthly)
          : "N/D"
      }`,
      `Tráfico total mensual estimado: ${
        totalTraffic > 0 ? formatNumber(totalTraffic) : "N/D"
      }`,
      `Notas de visibilidad: ${face.visibilityNotes || "N/D"}`,
    ];

    const artInfoLines = [
      `Tamaño: ${
        widthCm !== null && heightCm !== null
          ? `${formatNumber(widthCm)} x ${formatNumber(heightCm)} cm`
          : "N/D"
      }`,
      "Formato de color: N/D",
      `Resolución: ${
        face.productionSpec?.dpiRecommended
          ? `${face.productionSpec.dpiRecommended} dpi`
          : "N/D"
      }`,
      `Formato de archivo: ${face.productionSpec?.fileFormat || "N/D"}`,
      "Escala: 1:1",
    ];

    const commercialInfoLines = [
      `Tarifa diaria: ${dailyRate}`,
      `Tarifa mensual estimada: ${monthlyRate}`,
      `Tarifa de producción: ${productionMonthly}`,
      `Disponibilidad: ${
        activeHolds > 0 ? `Con bloqueos activos (${activeHolds})` : "Inmediata"
      }`,
      "Período mínimo: 1 mes",
    ];

    let currentY = bodyTop;
    currentY = drawSectionBlock({
      bodyFont,
      lines: generalInfoLines,
      page,
      title: "Información general",
      titleFont: headingFont,
      width: leftColumnWidth,
      x: leftX,
      yTop: currentY,
    });
    currentY -= 10;
    currentY = drawSectionBlock({
      bodyFont,
      lines: technicalInfoLines,
      page,
      title: "Especificaciones técnicas",
      titleFont: headingFont,
      width: leftColumnWidth,
      x: leftX,
      yTop: currentY,
    });
    currentY -= 10;
    currentY = drawSectionBlock({
      bodyFont,
      lines: audienceInfoLines,
      page,
      title: "Audiencia y tráfico",
      titleFont: headingFont,
      width: leftColumnWidth,
      x: leftX,
      yTop: currentY,
    });

    const imageTop = bodyTop;
    const faceImageBottom = imageTop - 190;
    const mapTop = faceImageBottom - 16;
    const mapBottom = mapTop - 166;
    const locationButtonTop = mapBottom - 12;
    const locationButtonHeight = 24;
    const mapsLinkTop = locationButtonTop - locationButtonHeight - 11;
    const leftLowerBlocksTop = Math.max(currentY - 10, bodyBottom + 170);
    const rightLowerBlocksTop = Math.min(leftLowerBlocksTop, mapsLinkTop - 22);

    drawSectionBlock({
      bodyFont,
      lines: artInfoLines,
      page,
      title: "Especificaciones de arte",
      titleFont: headingFont,
      width: leftColumnWidth,
      x: leftX,
      yTop: leftLowerBlocksTop,
    });
    drawSectionBlock({
      bodyFont,
      lines: commercialInfoLines,
      page,
      title: "Información comercial",
      titleFont: headingFont,
      width: rightColumnWidth,
      x: rightX,
      yTop: rightLowerBlocksTop,
    });

    drawImageBox({
      fallbackText: "Sin imagen principal",
      image: faceImage,
      page,
      width: rightColumnWidth,
      x: rightX,
      yBottom: faceImageBottom,
      yTop: imageTop,
    });

    drawImageBox({
      fallbackText:
        latitude !== null && longitude !== null
          ? `Mapa no disponible\n${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          : "Mapa no disponible",
      image: staticMapImage,
      page,
      width: rightColumnWidth,
      x: rightX,
      yBottom: mapBottom,
      yTop: mapTop,
    });

    page.drawRectangle({
      color: BRAND_BLUE,
      height: locationButtonHeight,
      width: rightColumnWidth,
      x: rightX,
      y: locationButtonTop - locationButtonHeight,
    });
    page.drawText("CLICK AQUÍ / VER UBICACIÓN", {
      color: WHITE,
      font: headingFont,
      size: 10.5,
      x: rightX + 10,
      y: locationButtonTop - 16,
    });
    if (mapsUrl) {
      const mapsLines = wrapText({
        font: bodyFont,
        fontSize: 7.5,
        maxWidth: rightColumnWidth - 2,
        text: mapsUrl,
      });
      let mapsY = mapsLinkTop;
      for (const line of mapsLines.slice(0, 2)) {
        page.drawText(line, {
          color: TEXT_MUTED,
          font: bodyFont,
          size: 7.5,
          x: rightX + 1,
          y: mapsY,
        });
        mapsY -= 9;
      }
    } else {
      page.drawText("Ubicación no disponible", {
        color: TEXT_MUTED,
        font: bodyFont,
        size: 8.2,
        x: rightX,
        y: mapsLinkTop + 1,
      });
    }

    const qrSize = 82;
    const qrX = rightX + rightColumnWidth - qrSize;
    const qrY = bodyBottom + 14;
    page.drawText("ESCANEA PARA VER", {
      color: BRAND_BLUE,
      font: headingFont,
      size: 8,
      x: qrX - 1,
      y: qrY + qrSize + 10,
    });
    page.drawText("LA FICHA ONLINE", {
      color: BRAND_BLUE,
      font: headingFont,
      size: 8,
      x: qrX + 1,
      y: qrY + qrSize + 1,
    });
    page.drawRectangle({
      borderColor: rgb(0.79, 0.84, 0.9),
      borderWidth: 0.8,
      color: WHITE,
      height: qrSize,
      width: qrSize,
      x: qrX,
      y: qrY,
    });
    if (qrImage) {
      const qrScale = Math.min(qrSize / qrImage.width, qrSize / qrImage.height);
      const qrRenderWidth = qrImage.width * qrScale;
      const qrRenderHeight = qrImage.height * qrScale;
      page.drawImage(qrImage, {
        height: qrRenderHeight,
        width: qrRenderWidth,
        x: qrX + (qrSize - qrRenderWidth) / 2,
        y: qrY + (qrSize - qrRenderHeight) / 2,
      });
    } else {
      page.drawText("QR no", {
        color: TEXT_MUTED,
        font: bodyFont,
        size: 9,
        x: qrX + 18,
        y: qrY + qrSize / 2 + 2,
      });
      page.drawText("disponible", {
        color: TEXT_MUTED,
        font: bodyFont,
        size: 9,
        x: qrX + 12,
        y: qrY + qrSize / 2 - 10,
      });
    }

  }

  return {
    fileName: `fichas-tecnicas-${formatDateForFileName(new Date())}.pdf`,
    includedFaceIds: orderedFaces.map((face) => face.id),
    pdfBytes: await pdfDocument.save(),
    skippedFaceIds,
  };
}
