import { TRPCError } from "@trpc/server";
import { printProcedure, router } from "../init";
import {
  addPrintEvidence,
  addPrintEvidenceSchema,
  claimPrintTask,
  claimPrintTaskSchema,
  confirmFinalPrint,
  confirmFinalPrintSchema,
  getPrintTaskByOrder,
  getPrintTaskByOrderSchema,
  listPrintInbox,
  printInboxListSchema,
  updatePrintTaskStatus,
  updatePrintTaskStatusSchema,
} from "@/lib/services/print-task";

export const printRouter = router({
  inbox: router({
    list: printProcedure
      .input(printInboxListSchema.optional())
      .query(async ({ input, ctx }) => {
        return listPrintInbox(input ?? printInboxListSchema.parse({}), {
          actorUserId: ctx.user.id,
        });
      }),
    claim: printProcedure
      .input(claimPrintTaskSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          return await claimPrintTask(input.taskId, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "No se pudo tomar la tarea.",
          });
        }
      }),
    updateStatus: printProcedure
      .input(updatePrintTaskStatusSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          return await updatePrintTaskStatus(input, ctx.user.id);
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
  evidence: router({
    add: printProcedure
      .input(addPrintEvidenceSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          return await addPrintEvidence(input, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo registrar la evidencia de impresion.",
          });
        }
      }),
  }),
  confirmFinal: printProcedure
    .input(confirmFinalPrintSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await confirmFinalPrint(input, ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "No se pudo confirmar impresion.",
        });
      }
    }),
  byOrder: printProcedure
    .input(getPrintTaskByOrderSchema)
    .query(async ({ input }) => {
      return getPrintTaskByOrder(input.orderId);
    }),
});
