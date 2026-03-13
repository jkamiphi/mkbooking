import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseOrganizationContextCookieHeader } from "@/lib/services/organization-access";

export async function createContext(opts: FetchCreateContextFnOptions) {
  const session = await auth.api.getSession({
    headers: opts.req.headers,
  });
  const activeOrganizationContextKey = parseOrganizationContextCookieHeader(
    opts.req.headers.get("cookie"),
  );

  return {
    db,
    session,
    user: session?.user ?? null,
    activeOrganizationContextKey,
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

type AllowedSystemRole =
  | "SUPERADMIN"
  | "STAFF"
  | "DESIGNER"
  | "SALES"
  | "OPERATIONS_PRINT"
  | "INSTALLER";

async function resolveUserSystemRole(
  ctx: Context
): Promise<AllowedSystemRole | "CUSTOMER" | null> {
  if (!ctx.user) {
    return null;
  }

  const profile = await ctx.db.userProfile.findUnique({
    where: { userId: ctx.user.id },
    select: { systemRole: true },
  });

  return profile?.systemRole ?? null;
}

// Middleware to check if user is authenticated
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
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

  const systemRole = await resolveUserSystemRole(ctx);

  if (!systemRole || !["SUPERADMIN", "STAFF"].includes(systemRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
      systemRole,
    },
  });
});

// Middleware for commercial surfaces (/admin/orders and /admin/requests)
const isCommercial = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const systemRole = await resolveUserSystemRole(ctx);

  if (!systemRole || !["SUPERADMIN", "STAFF", "SALES"].includes(systemRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Commercial access required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
      systemRole,
    },
  });
});

// Middleware for sales validation actions
const isSalesReviewer = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const systemRole = await resolveUserSystemRole(ctx);

  if (!systemRole || !["SUPERADMIN", "SALES"].includes(systemRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sales review access required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
      systemRole,
    },
  });
});

// Middleware for design workflow actions
const isDesignReviewer = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const systemRole = await resolveUserSystemRole(ctx);

  if (!systemRole || !["SUPERADMIN", "STAFF", "DESIGNER"].includes(systemRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Design workflow access required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
      systemRole,
    },
  });
});

// Middleware for print workflow actions
const isPrintOperator = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const systemRole = await resolveUserSystemRole(ctx);

  if (!systemRole || !["SUPERADMIN", "STAFF", "OPERATIONS_PRINT"].includes(systemRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Print workflow access required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
      systemRole,
    },
  });
});

// Middleware for operational workflow actions
const isOperationsOperator = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const systemRole = await resolveUserSystemRole(ctx);

  if (!systemRole || !["SUPERADMIN", "STAFF", "SALES"].includes(systemRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Operational workflow access required",
    });
  }

  return next({
    ctx: {
      session: ctx.session,
      user: ctx.user,
      systemRole,
    },
  });
});

// Middleware for installer workflow actions
const isInstaller = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const profile = await ctx.db.userProfile.findUnique({
    where: { userId: ctx.user.id },
    select: { systemRole: true, isActive: true },
  });

  if (!profile || profile.systemRole !== "INSTALLER" || !profile.isActive) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Installer access required",
    });
  }

  return next({
    ctx: {
      ...ctx,
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

  const systemRole = await resolveUserSystemRole(ctx);

  if (!systemRole || systemRole !== "SUPERADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Superadmin access required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
      systemRole,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
export const adminProcedure = t.procedure.use(isAdmin);
export const commercialProcedure = t.procedure.use(isCommercial);
export const salesReviewProcedure = t.procedure.use(isSalesReviewer);
export const designProcedure = t.procedure.use(isDesignReviewer);
export const printProcedure = t.procedure.use(isPrintOperator);
export const operationsProcedure = t.procedure.use(isOperationsOperator);
export const installerProcedure = t.procedure.use(isInstaller);
export const superAdminProcedure = t.procedure.use(isSuperAdmin);
