import { TRPCError } from "@trpc/server";
import { installerProcedure, router } from "../init";
import {
  addInstallerTaskEvidence,
  completeInstallerTask,
  getInstallerTaskById,
  installerAddEvidenceSchema,
  installerCompleteTaskSchema,
  installerStartTaskSchema,
  installerTaskByIdSchema,
  installerTaskListSchema,
  installerToggleChecklistItemSchema,
  listInstallerTasksMine,
  startInstallerTask,
  toggleInstallerChecklistItem,
} from "@/lib/services/installer-operations";

export const installerRouter = router({
  tasks: router({
    listMine: installerProcedure
      .input(installerTaskListSchema.optional())
      .query(async ({ ctx, input }) => {
        return listInstallerTasksMine(
          ctx.user.id,
          input ?? installerTaskListSchema.parse({})
        );
      }),
    getById: installerProcedure
      .input(installerTaskByIdSchema)
      .query(async ({ ctx, input }) => {
        try {
          return await getInstallerTaskById(ctx.user.id, input.workOrderId);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo cargar el detalle de la OT.",
          });
        }
      }),
    start: installerProcedure
      .input(installerStartTaskSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await startInstallerTask(ctx.user.id, input);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo iniciar la OT operativa.",
          });
        }
      }),
    complete: installerProcedure
      .input(installerCompleteTaskSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await completeInstallerTask(ctx.user.id, input);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo enviar la OT operativa a revisión.",
          });
        }
      }),
    toggleChecklistItem: installerProcedure
      .input(installerToggleChecklistItemSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await toggleInstallerChecklistItem(ctx.user.id, input);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo actualizar el checklist de la OT.",
          });
        }
      }),
    addEvidence: installerProcedure
      .input(installerAddEvidenceSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await addInstallerTaskEvidence(ctx.user.id, input);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo cargar la evidencia de la OT.",
          });
        }
      }),
  }),
});
