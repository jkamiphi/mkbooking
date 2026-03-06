import { TRPCError } from "@trpc/server";
import { operationsProcedure, router } from "../init";
import {
  approveOperationalWorkOrderReview,
  approveOperationalWorkOrderReviewSchema,
  getOperationalWorkOrdersByOrder,
  getOperationalWorkOrderDetail,
  listInstallersWithControl,
  listOperationalWorkOrders,
  operationalWorkOrderDetailSchema,
  operationalWorkOrderByOrderSchema,
  operationalWorkOrderListSchema,
  reassignOperationalWorkOrderManual,
  reassignOperationalWorkOrderSchema,
  reopenOperationalWorkOrderForRework,
  reopenOperationalWorkOrderSchema,
  retryOperationalWorkOrderAutoAssign,
  retryOperationalWorkOrderAutoAssignSchema,
  updateInstallerCoverage,
  updateInstallerCoverageSchema,
  upsertInstallerConfig,
  upsertInstallerConfigSchema,
} from "@/lib/services/operations";

export const operationsRouter = router({
  workOrders: router({
    list: operationsProcedure
      .input(operationalWorkOrderListSchema.optional())
      .query(async ({ input }) => {
        return listOperationalWorkOrders(input ?? operationalWorkOrderListSchema.parse({}));
      }),
    byOrder: operationsProcedure
      .input(operationalWorkOrderByOrderSchema)
      .query(async ({ input }) => {
        return getOperationalWorkOrdersByOrder(input.orderId);
      }),
    getDetail: operationsProcedure
      .input(operationalWorkOrderDetailSchema)
      .query(async ({ input }) => {
        return getOperationalWorkOrderDetail(input);
      }),
    approveReview: operationsProcedure
      .input(approveOperationalWorkOrderReviewSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          return await approveOperationalWorkOrderReview(input, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo aprobar la revisión de la OT operativa.",
          });
        }
      }),
    reopenForRework: operationsProcedure
      .input(reopenOperationalWorkOrderSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          return await reopenOperationalWorkOrderForRework(input, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo reabrir la OT operativa.",
          });
        }
      }),
    reassignManual: operationsProcedure
      .input(reassignOperationalWorkOrderSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          return await reassignOperationalWorkOrderManual(input, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo reasignar manualmente la OT operativa.",
          });
        }
      }),
    retryAutoAssign: operationsProcedure
      .input(retryOperationalWorkOrderAutoAssignSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          return await retryOperationalWorkOrderAutoAssign(input, ctx.user.id);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo reintentar la autoasignación de la OT operativa.",
          });
        }
      }),
  }),
  installers: router({
    list: operationsProcedure.query(async () => {
      return listInstallersWithControl();
    }),
    upsertConfig: operationsProcedure
      .input(upsertInstallerConfigSchema)
      .mutation(async ({ input }) => {
        try {
          return await upsertInstallerConfig(input);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo actualizar la configuración del instalador.",
          });
        }
      }),
    updateCoverage: operationsProcedure
      .input(updateInstallerCoverageSchema)
      .mutation(async ({ input }) => {
        try {
          return await updateInstallerCoverage(input);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo actualizar la cobertura del instalador.",
          });
        }
      }),
  }),
});
