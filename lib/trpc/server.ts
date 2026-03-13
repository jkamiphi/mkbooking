import { cache } from "react";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCallerFactory } from "@/lib/trpc/init";
import { appRouter } from "@/lib/trpc/routers";
import { ORGANIZATION_CONTEXT_COOKIE_NAME } from "@/lib/services/organization-access";

const createCaller = createCallerFactory(appRouter);

export const getServerSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

export const createServerTRPCCaller = cache(async () => {
  const [session, cookieStore] = await Promise.all([
    getServerSession(),
    cookies(),
  ]);
  return createCaller({
    db,
    session,
    user: session?.user ?? null,
    activeOrganizationContextKey:
      cookieStore.get(ORGANIZATION_CONTEXT_COOKIE_NAME)?.value ?? null,
  });
});
