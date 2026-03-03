import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUploadScopeKeyPrefix, uploadPublicObject } from "@/lib/storage/s3";

const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
const PDF_MIME_TYPE = "application/pdf";

export const runtime = "nodejs";

function normalizeScope(rawScope: FormDataEntryValue | null): string | null {
  if (typeof rawScope !== "string") {
    return null;
  }

  const trimmedScope = rawScope.trim();
  return trimmedScope.length > 0 ? trimmedScope : null;
}

function isImageOnlyScope(scope: string | null): boolean {
  if (!scope) {
    return false;
  }

  return (
    scope === "catalog-face-primary" ||
    scope === "inventory-zone" ||
    scope === "inventory-structure-type" ||
    scope === "inventory-asset-image" ||
    scope === "inventory-face-image" ||
    scope === "orders-operational-evidence"
  );
}

function isAllowedMimeType(mimeType: string, scope: string | null): boolean {
  if (isImageOnlyScope(scope)) {
    return mimeType.startsWith("image/");
  }

  return mimeType.startsWith("image/") || mimeType === PDF_MIME_TYPE;
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const scope = normalizeScope(formData.get("scope"));

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!isAllowedMimeType(file.type, scope)) {
    const message = isImageOnlyScope(scope)
      ? "Only image files are allowed for this upload scope"
      : "Only images and PDF files are allowed";

    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File exceeds maximum size of 20MB" },
      { status: 400 }
    );
  }

  try {
    const uploadResult = await uploadPublicObject({
      body: Buffer.from(await file.arrayBuffer()),
      cacheControl: "public, max-age=31536000, immutable",
      contentType: file.type,
      fileName: file.name,
      keyPrefix: resolveUploadScopeKeyPrefix(scope),
      metadata: {
        uploaderId: session.user.id,
        ...(scope ? { scope } : {}),
      },
    });

    return NextResponse.json({
      contentType: uploadResult.contentType,
      key: uploadResult.key,
      scope,
      size: file.size,
      url: uploadResult.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upload error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
