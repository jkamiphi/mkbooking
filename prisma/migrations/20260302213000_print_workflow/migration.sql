-- AlterEnum
ALTER TYPE "system_role" ADD VALUE IF NOT EXISTS 'OPERATIONS_PRINT';

-- CreateEnum
CREATE TYPE "order_print_task_status" AS ENUM (
    'READY',
    'IN_PROGRESS',
    'COMPLETED'
);

-- CreateEnum
CREATE TYPE "order_print_task_event_type" AS ENUM (
    'TASK_ACTIVATED',
    'TASK_CLAIMED',
    'STATUS_CHANGED',
    'FINAL_PRINT_CONFIRMED',
    'REOPENED_BY_DESIGN'
);

-- CreateTable
CREATE TABLE "order_print_task" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "order_print_task_status" NOT NULL DEFAULT 'READY',
    "assignedToId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "activatedProofVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_print_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_print_task_event" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "eventType" "order_print_task_event_type" NOT NULL,
    "fromStatus" "order_print_task_status",
    "toStatus" "order_print_task_status",
    "notes" TEXT,
    "metadata" JSONB,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_print_task_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_print_evidence" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_print_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_print_task_orderId_key" ON "order_print_task"("orderId");

-- CreateIndex
CREATE INDEX "order_print_task_status_idx" ON "order_print_task"("status");

-- CreateIndex
CREATE INDEX "order_print_task_assignedToId_idx" ON "order_print_task"("assignedToId");

-- CreateIndex
CREATE INDEX "order_print_task_closedAt_idx" ON "order_print_task"("closedAt");

-- CreateIndex
CREATE INDEX "order_print_task_event_taskId_idx" ON "order_print_task_event"("taskId");

-- CreateIndex
CREATE INDEX "order_print_task_event_eventType_idx" ON "order_print_task_event"("eventType");

-- CreateIndex
CREATE INDEX "order_print_task_event_actorId_idx" ON "order_print_task_event"("actorId");

-- CreateIndex
CREATE INDEX "order_print_task_event_createdAt_idx" ON "order_print_task_event"("createdAt");

-- CreateIndex
CREATE INDEX "order_print_evidence_taskId_idx" ON "order_print_evidence"("taskId");

-- CreateIndex
CREATE INDEX "order_print_evidence_uploadedById_idx" ON "order_print_evidence"("uploadedById");

-- AddForeignKey
ALTER TABLE "order_print_task" ADD CONSTRAINT "order_print_task_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_print_task" ADD CONSTRAINT "order_print_task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_print_task" ADD CONSTRAINT "order_print_task_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_print_task_event" ADD CONSTRAINT "order_print_task_event_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "order_print_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_print_task_event" ADD CONSTRAINT "order_print_task_event_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_print_evidence" ADD CONSTRAINT "order_print_evidence_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "order_print_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_print_evidence" ADD CONSTRAINT "order_print_evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill print tasks for orders with design already closed
INSERT INTO "order_print_task" (
    "id",
    "orderId",
    "status",
    "activatedProofVersion",
    "createdAt",
    "updatedAt"
)
SELECT
    'opt-' || md5(dt."orderId" || '-print-task'),
    dt."orderId",
    'READY'::"order_print_task_status",
    COALESCE(dt."designerApprovedProofVersion", dt."clientApprovedProofVersion"),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "order_design_task" dt
WHERE dt."closedAt" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "order_print_task" pt
    WHERE pt."orderId" = dt."orderId"
  );

-- Backfill activation events for created/available print tasks
INSERT INTO "order_print_task_event" (
    "id",
    "taskId",
    "eventType",
    "toStatus",
    "notes",
    "metadata",
    "createdAt"
)
SELECT
    'opte-' || md5(pt."id" || '-task-activated'),
    pt."id",
    'TASK_ACTIVATED',
    pt."status",
    'Tarea de impresion activada automaticamente por migracion.',
    jsonb_build_object('source', 'migration', 'name', '20260302213000_print_workflow'),
    CURRENT_TIMESTAMP
FROM "order_print_task" pt
WHERE NOT EXISTS (
    SELECT 1
    FROM "order_print_task_event" pte
    WHERE pte."taskId" = pt."id"
      AND pte."eventType" = 'TASK_ACTIVATED'
  );
