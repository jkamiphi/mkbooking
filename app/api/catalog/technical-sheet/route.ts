import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateTechnicalSheetsPdf } from "@/lib/services/catalog-technical-sheet";
import {
  parseOrganizationContextCookieHeader,
  resolveActiveOrganizationContextForUser,
} from "@/lib/services/organization-access";

export const runtime = "nodejs";

function parseFaceIds(rawFaceIds: string | null) {
  if (!rawFaceIds) {
    return [];
  }

  const seen = new Set<string>();
  const orderedUniqueIds: string[] = [];
  for (const rawId of rawFaceIds.split(",")) {
    const normalizedId = rawId.trim();
    if (!normalizedId || seen.has(normalizedId)) {
      continue;
    }
    seen.add(normalizedId);
    orderedUniqueIds.push(normalizedId);
  }

  return orderedUniqueIds;
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const orderedFaceIds = parseFaceIds(requestUrl.searchParams.get("faces"));

  if (orderedFaceIds.length === 0) {
    return NextResponse.json(
      { error: "Debes seleccionar al menos una cara para descargar la ficha técnica." },
      { status: 400 },
    );
  }

  const activeContextKey = parseOrganizationContextCookieHeader(
    request.headers.get("cookie"),
  );
  const { activeContext } = await resolveActiveOrganizationContextForUser(
    session.user.id,
    activeContextKey,
  );
  const brandId = activeContext?.brandId ?? undefined;

  const generatedPdf = await generateTechnicalSheetsPdf({
    brandId,
    faceIds: orderedFaceIds,
    includeCommercialData: true,
  });

  if (generatedPdf.includedFaceIds.length === 0 || generatedPdf.pdfBytes.length === 0) {
    return NextResponse.json(
      {
        error:
          "No se encontraron caras publicadas válidas dentro de tu selección actual.",
      },
      { status: 400 },
    );
  }

  return new Response(Buffer.from(generatedPdf.pdfBytes), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Disposition": `attachment; filename="${generatedPdf.fileName}"`,
      "Content-Type": "application/pdf",
      "X-MK-Skipped-Faces": `${generatedPdf.skippedFaceIds.length}`,
    },
    status: 200,
  });
}
