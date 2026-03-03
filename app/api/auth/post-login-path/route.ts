import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolvePostLoginPathByRole } from "@/lib/navigation/role-home";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ path: "/login" }, { status: 401 });
  }

  const profile = await db.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { systemRole: true },
  });

  return NextResponse.json({
    path: resolvePostLoginPathByRole(profile?.systemRole),
  });
}
