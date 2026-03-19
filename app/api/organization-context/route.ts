import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ORGANIZATION_CONTEXT_COOKIE_NAME,
  resolveActiveOrganizationContextForUser,
} from "@/lib/services/organization-access";

const requestBodySchema = z.object({
  contextKey: z.string().trim().min(1).nullable().optional(),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const profile = await db.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { isActive: true },
  });

  if (profile?.isActive === false) {
    return NextResponse.json({ message: "Account is inactive" }, { status: 403 });
  }

  const rawBody = await request
    .json()
    .catch(() => null);
  const requestBody = requestBodySchema.safeParse(rawBody);
  if (!requestBody.success) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const contextKey = requestBody.data.contextKey ?? null;

  if (!contextKey) {
    cookieStore.delete(ORGANIZATION_CONTEXT_COOKIE_NAME);
    return NextResponse.json({ ok: true, activeContext: null });
  }

  const { contexts } = await resolveActiveOrganizationContextForUser(
    session.user.id,
    contextKey,
  );
  const matchedContext = contexts.find(
    (context) => context.contextKey === contextKey,
  );

  if (!matchedContext) {
    return NextResponse.json(
      { message: "Organization context not available for this user" },
      { status: 403 },
    );
  }

  cookieStore.set(ORGANIZATION_CONTEXT_COOKIE_NAME, contextKey, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({
    ok: true,
    activeContext: matchedContext,
  });
}
