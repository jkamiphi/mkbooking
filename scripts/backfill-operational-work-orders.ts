import { db } from "@/lib/db";
import { createOperationalWorkOrdersForPrintCompletion } from "@/lib/services/operations";

async function backfillOperationalWorkOrders() {
  console.log("Starting backfill for operational work orders...");

  const printTasks = await db.orderPrintTask.findMany({
    where: {
      completedAt: {
        not: null,
      },
    },
    select: {
      id: true,
      orderId: true,
      completedAt: true,
    },
    orderBy: {
      completedAt: "asc",
    },
  });

  let createdTotal = 0;
  let autoAssignedTotal = 0;
  let pendingTotal = 0;
  let processed = 0;

  for (const printTask of printTasks) {
    const completedAt = printTask.completedAt;
    if (!completedAt) {
      continue;
    }

    const summary = await db.$transaction((tx) =>
      createOperationalWorkOrdersForPrintCompletion(tx, {
        orderId: printTask.orderId,
        printTaskId: printTask.id,
        printTaskCompletedAt: completedAt,
        actorId: null,
        source: "backfill",
      })
    );

    processed += 1;
    createdTotal += summary.createdCount;
    autoAssignedTotal += summary.autoAssignedCount;
    pendingTotal += summary.pendingCount;
  }

  console.log("Backfill completed.");
  console.log(`Print tasks processed: ${processed}`);
  console.log(`Operational work orders created: ${createdTotal}`);
  console.log(`Auto-assigned: ${autoAssignedTotal}`);
  console.log(`Pending assignment: ${pendingTotal}`);
}

backfillOperationalWorkOrders()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
