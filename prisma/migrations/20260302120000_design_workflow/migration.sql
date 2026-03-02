-- AlterEnum
ALTER TYPE "system_role" ADD VALUE IF NOT EXISTS 'DESIGNER';

-- CreateEnum
CREATE TYPE "order_design_task_status" AS ENUM (
    'REVIEW',
    'ADJUST',
    'CREATE_FROM_SCRATCH',
    'COLOR_PROOF_READY'
);

-- CreateEnum
CREATE TYPE "order_design_task_event_type" AS ENUM (
    'TASK_CREATED',
    'TASK_CLAIMED',
    'STATUS_CHANGED',
    'PROOF_UPLOADED',
    'CLIENT_APPROVED',
    'CLIENT_CHANGES_REQUESTED'
);

-- CreateEnum
CREATE TYPE "creative_source_type" AS ENUM ('FILE_UPLOAD', 'EXTERNAL_URL');

-- CreateEnum
CREATE TYPE "creative_kind" AS ENUM ('CLIENT_ARTWORK', 'DESIGN_PROOF');

-- AlterTable
ALTER TABLE "order_creative"
    ADD COLUMN "sourceType" "creative_source_type" NOT NULL DEFAULT 'FILE_UPLOAD',
    ADD COLUMN "creativeKind" "creative_kind" NOT NULL DEFAULT 'CLIENT_ARTWORK';

-- CreateTable
CREATE TABLE "order_design_task" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "order_design_task_status" NOT NULL DEFAULT 'REVIEW',
    "slaDueAt" TIMESTAMP(3) NOT NULL,
    "assignedToId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_design_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_design_task_event" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "eventType" "order_design_task_event_type" NOT NULL,
    "fromStatus" "order_design_task_status",
    "toStatus" "order_design_task_status",
    "notes" TEXT,
    "metadata" JSONB,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_design_task_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_creative_creativeKind_idx" ON "order_creative"("creativeKind");

-- CreateIndex
CREATE UNIQUE INDEX "order_design_task_orderId_key" ON "order_design_task"("orderId");

-- CreateIndex
CREATE INDEX "order_design_task_status_idx" ON "order_design_task"("status");

-- CreateIndex
CREATE INDEX "order_design_task_assignedToId_idx" ON "order_design_task"("assignedToId");

-- CreateIndex
CREATE INDEX "order_design_task_slaDueAt_idx" ON "order_design_task"("slaDueAt");

-- CreateIndex
CREATE INDEX "order_design_task_closedAt_idx" ON "order_design_task"("closedAt");

-- CreateIndex
CREATE INDEX "order_design_task_event_taskId_idx" ON "order_design_task_event"("taskId");

-- CreateIndex
CREATE INDEX "order_design_task_event_eventType_idx" ON "order_design_task_event"("eventType");

-- CreateIndex
CREATE INDEX "order_design_task_event_actorId_idx" ON "order_design_task_event"("actorId");

-- CreateIndex
CREATE INDEX "order_design_task_event_createdAt_idx" ON "order_design_task_event"("createdAt");

-- AddForeignKey
ALTER TABLE "order_design_task" ADD CONSTRAINT "order_design_task_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_design_task" ADD CONSTRAINT "order_design_task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_design_task" ADD CONSTRAINT "order_design_task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_design_task_event" ADD CONSTRAINT "order_design_task_event_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "order_design_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_design_task_event" ADD CONSTRAINT "order_design_task_event_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill tasks for already confirmed orders
INSERT INTO "order_design_task" (
    "id",
    "orderId",
    "status",
    "slaDueAt",
    "createdAt",
    "updatedAt"
)
SELECT
    'odt-' || md5(o."id" || '-design-task'),
    o."id",
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM "order_service_item" osi
        LEFT JOIN "campaign_service" cs ON cs."id" = osi."serviceId"
        WHERE osi."orderId" = o."id"
          AND (
            osi."serviceCodeSnapshot" = 'DISENO_ARTE'
            OR cs."code" = 'DISENO_ARTE'
          )
      )
      THEN 'CREATE_FROM_SCRATCH'::"order_design_task_status"
      ELSE 'REVIEW'::"order_design_task_status"
    END,
    COALESCE(o."companyConfirmedAt", CURRENT_TIMESTAMP) + INTERVAL '48 hours',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "order" o
WHERE o."status" = 'confirmed'
  AND NOT EXISTS (
    SELECT 1
    FROM "order_design_task" dt
    WHERE dt."orderId" = o."id"
  );

-- Backfill task creation events
INSERT INTO "order_design_task_event" (
    "id",
    "taskId",
    "eventType",
    "toStatus",
    "notes",
    "metadata",
    "createdAt"
)
SELECT
    'odte-' || md5(dt."id" || '-task-created'),
    dt."id",
    'TASK_CREATED',
    dt."status",
    'Tarea de diseno creada automaticamente por migracion.',
    jsonb_build_object('source', 'migration', 'name', '20260302120000_design_workflow'),
    CURRENT_TIMESTAMP
FROM "order_design_task" dt
WHERE NOT EXISTS (
    SELECT 1
    FROM "order_design_task_event" dte
    WHERE dte."taskId" = dt."id"
      AND dte."eventType" = 'TASK_CREATED'
);
