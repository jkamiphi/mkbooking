import { NextResponse } from "next/server";
import { z } from "zod";
import { OrganizationType, UserAccountType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createStarterOrganization } from "@/lib/services/organization";
import { getOrCreateUserProfile } from "@/lib/services/user-profile";

const requestBodySchema = z.object({
  accountType: z.nativeEnum(UserAccountType),
  workspaceName: z.string().trim().min(1).max(120),
});

function resolveBootstrapOrganizationType(accountType: UserAccountType) {
  if (accountType === UserAccountType.AGENCY) {
    return OrganizationType.AGENCY;
  }

  return OrganizationType.ADVERTISER;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const payload = requestBodySchema.safeParse(rawBody);
  if (!payload.success) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const profile = await getOrCreateUserProfile(session.user.id, null);
  if (!profile) {
    return NextResponse.json({ message: "User profile not found" }, { status: 404 });
  }

  if (profile.organizationRoles.length > 0) {
    return NextResponse.json(
      { message: "Workspace already initialized" },
      { status: 409 },
    );
  }

  await db.userProfile.update({
    where: { id: profile.id },
    data: { accountType: payload.data.accountType },
  });

  const organization = await createStarterOrganization(
    {
      name: payload.data.workspaceName,
      organizationType: resolveBootstrapOrganizationType(payload.data.accountType),
    },
    profile.id,
    {
      userId: session.user.id,
      activeContextKey: null,
    },
  );

  return NextResponse.json({
    ok: true,
    organization,
  });
}
