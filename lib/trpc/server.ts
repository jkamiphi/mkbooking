import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCallerFactory } from "@/lib/trpc/init";
import { appRouter } from "@/lib/trpc/routers";

const createCaller = createCallerFactory(appRouter);

export const getServerSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

export const createServerTRPCCaller = cache(async () => {
  const session = await getServerSession();
  return createCaller({
    db,
    session,
    user: session?.user ?? null,
  });
});
