import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function createContext() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return {
    db,
    session,
    user: session?.user ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

// Middleware to check if user is authenticated
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: ctx.session,
      user: ctx.user,
    },
  });
});

// Middleware to check if user is admin (SUPERADMIN or STAFF)
const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const profile = await ctx.db.userProfile.findUnique({
    where: { userId: ctx.user.id },
    select: { systemRole: true },
  });

  if (!profile || !["SUPERADMIN", "STAFF"].includes(profile.systemRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return next({
    ctx: {
      session: ctx.session,
      user: ctx.user,
      systemRole: profile.systemRole,
    },
  });
});

// Middleware to check if user is superadmin only
const isSuperAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const profile = await ctx.db.userProfile.findUnique({
    where: { userId: ctx.user.id },
    select: { systemRole: true },
  });

  if (!profile || profile.systemRole !== "SUPERADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Superadmin access required",
    });
  }

  return next({
    ctx: {
      session: ctx.session,
      user: ctx.user,
      systemRole: profile.systemRole,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
export const adminProcedure = t.procedure.use(isAdmin);
export const superAdminProcedure = t.procedure.use(isSuperAdmin);
