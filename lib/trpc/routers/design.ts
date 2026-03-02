import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { protectedProcedure, router, designProcedure } from "../init";
import {
  canUserAccessOrder,
  claimDesignTask,
  claimDesignTaskSchema,
  clientProofDecisionSchema,
  designerProofDecisionSchema,
  designInboxListSchema,
  getDesignTaskByOrder,
  getDesignTaskByOrderSchema,
  listDesignInbox,
  registerDesignerProofDecision,
  registerClientProofDecision,
  updateDesignTaskStatus,
  updateDesignTaskStatusSchema,
  uploadDesignProof,
  uploadDesignProofSchema,
} from "@/lib/services/design-task";

async function resolveSystemRole(userId: string) {
  const profile = await db.userProfile.findUnique({
    where: { userId },
    select: { systemRole: true },
  });

  return profile?.systemRole ?? null;
}

async function assertOrderAccess(userId: string, orderId: string) {
  const systemRole = await resolveSystemRole(userId);
  if (systemRole && ["SUPERADMIN", "STAFF", "DESIGNER", "SALES"].includes(systemRole)) {
    return;
  }

  const hasAccess = await canUserAccessOrder(userId, orderId);
  if (!hasAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No tienes acceso a esta orden.",
    });
  }
}

export const designRouter = router({
  inbox: router({
    list: designProcedure
      .input(designInboxListSchema.optional())
      .query(async ({ input, ctx }) => {
        return listDesignInbox(input ?? designInboxListSchema.parse({}), {
          actorUserId: ctx.user.id,
        });
      }),
    claim: designProcedure
      .input(claimDesignTaskSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          return await claimDesignTask(input.taskId, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "No se pudo tomar la tarea.",
          });
        }
      }),
    updateStatus: designProcedure
      .input(updateDesignTaskStatusSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          return await updateDesignTaskStatus(input, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo actualizar el estado de la tarea.",
          });
        }
      }),
  }),
  proofs: router({
    upload: designProcedure
      .input(uploadDesignProofSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          return await uploadDesignProof(input, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error ? error.message : "No se pudo subir la prueba de color.",
          });
        }
      }),
    designerDecision: designProcedure
      .input(designerProofDecisionSchema)
      .mutation(async ({ input, ctx }) => {
        if (input.decision === "CHANGES_REQUESTED" && !input.notes?.trim()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Debes incluir notas cuando se solicitan cambios.",
          });
        }

        try {
          return await registerDesignerProofDecision(input, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo registrar la decision del dissenador.",
          });
        }
      }),
    clientDecision: protectedProcedure
      .input(clientProofDecisionSchema)
      .mutation(async ({ input, ctx }) => {
        await assertOrderAccess(ctx.user.id, input.orderId);
        if (input.decision === "CHANGES_REQUESTED" && !input.notes?.trim()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Debes incluir notas cuando se solicitan cambios.",
          });
        }

        try {
          return await registerClientProofDecision(input, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo registrar la decision del cliente.",
          });
        }
      }),
  }),
  byOrder: protectedProcedure
    .input(getDesignTaskByOrderSchema)
    .query(async ({ input, ctx }) => {
      await assertOrderAccess(ctx.user.id, input.orderId);

      const task = await getDesignTaskByOrder(input.orderId);
      if (!task) {
        return null;
      }

      return task;
    }),
});
