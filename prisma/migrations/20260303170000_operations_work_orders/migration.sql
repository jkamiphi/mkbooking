-- AlterEnum
ALTER TYPE "system_role" ADD VALUE IF NOT EXISTS 'INSTALLER';

-- CreateEnum
CREATE TYPE "operational_work_order_status" AS ENUM (
    'PENDING_ASSIGNMENT',
    'ASSIGNED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);

-- CreateEnum
CREATE TYPE "operational_work_order_event_type" AS ENUM (
    'WORK_ORDER_CREATED',
    'AUTO_ASSIGNED',
    'AUTO_ASSIGNMENT_SKIPPED',
    'MANUAL_REASSIGNED',
    'STATUS_CHANGED',
    'CANCELLED_BY_PRINT_REOPEN',
    'AUTO_ASSIGNMENT_RETRIED'
);

-- CreateTable
CREATE TABLE "installer_config" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxActiveWorkOrders" INTEGER NOT NULL DEFAULT 5,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installer_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installer_coverage_zone" (
    "id" TEXT NOT NULL,
    "installerId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "installer_coverage_zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_operational_work_order" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "lineItemId" TEXT NOT NULL,
    "faceId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "printTaskId" TEXT NOT NULL,
    "printTaskCompletedAt" TIMESTAMP(3) NOT NULL,
    "status" "operational_work_order_status" NOT NULL DEFAULT 'PENDING_ASSIGNMENT',
    "assignedInstallerId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_operational_work_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_operational_work_order_event" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "eventType" "operational_work_order_event_type" NOT NULL,
    "fromStatus" "operational_work_order_status",
    "toStatus" "operational_work_order_status",
    "fromInstallerId" TEXT,
    "toInstallerId" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_operational_work_order_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "installer_config_userProfileId_key" ON "installer_config"("userProfileId");

-- CreateIndex
CREATE INDEX "installer_config_isEnabled_idx" ON "installer_config"("isEnabled");

-- CreateIndex
CREATE INDEX "installer_config_maxActiveWorkOrders_idx" ON "installer_config"("maxActiveWorkOrders");

-- CreateIndex
CREATE UNIQUE INDEX "installer_coverage_zone_installerId_zoneId_key" ON "installer_coverage_zone"("installerId", "zoneId");

-- CreateIndex
CREATE INDEX "installer_coverage_zone_installerId_idx" ON "installer_coverage_zone"("installerId");

-- CreateIndex
CREATE INDEX "installer_coverage_zone_zoneId_idx" ON "installer_coverage_zone"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "order_operational_work_order_printTaskId_lineItemId_printTaskCompletedAt_key" ON "order_operational_work_order"("printTaskId", "lineItemId", "printTaskCompletedAt");

-- CreateIndex
CREATE INDEX "order_operational_work_order_assignedInstallerId_status_idx" ON "order_operational_work_order"("assignedInstallerId", "status");

-- CreateIndex
CREATE INDEX "order_operational_work_order_zoneId_status_idx" ON "order_operational_work_order"("zoneId", "status");

-- CreateIndex
CREATE INDEX "order_operational_work_order_printTaskId_idx" ON "order_operational_work_order"("printTaskId");

-- CreateIndex
CREATE INDEX "order_operational_work_order_lineItemId_idx" ON "order_operational_work_order"("lineItemId");

-- CreateIndex
CREATE INDEX "order_operational_work_order_closedAt_idx" ON "order_operational_work_order"("closedAt");

-- CreateIndex
CREATE INDEX "order_operational_work_order_status_idx" ON "order_operational_work_order"("status");

-- CreateIndex
CREATE INDEX "order_operational_work_order_event_workOrderId_idx" ON "order_operational_work_order_event"("workOrderId");

-- CreateIndex
CREATE INDEX "order_operational_work_order_event_eventType_idx" ON "order_operational_work_order_event"("eventType");

-- CreateIndex
CREATE INDEX "order_operational_work_order_event_actorId_idx" ON "order_operational_work_order_event"("actorId");

-- CreateIndex
CREATE INDEX "order_operational_work_order_event_createdAt_idx" ON "order_operational_work_order_event"("createdAt");

-- AddForeignKey
ALTER TABLE "installer_config" ADD CONSTRAINT "installer_config_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installer_coverage_zone" ADD CONSTRAINT "installer_coverage_zone_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "user_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installer_coverage_zone" ADD CONSTRAINT "installer_coverage_zone_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_operational_work_order" ADD CONSTRAINT "order_operational_work_order_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_operational_work_order" ADD CONSTRAINT "order_operational_work_order_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "order_line_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_operational_work_order" ADD CONSTRAINT "order_operational_work_order_faceId_fkey" FOREIGN KEY ("faceId") REFERENCES "asset_face"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_operational_work_order" ADD CONSTRAINT "order_operational_work_order_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_operational_work_order" ADD CONSTRAINT "order_operational_work_order_printTaskId_fkey" FOREIGN KEY ("printTaskId") REFERENCES "order_print_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_operational_work_order" ADD CONSTRAINT "order_operational_work_order_assignedInstallerId_fkey" FOREIGN KEY ("assignedInstallerId") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_operational_work_order" ADD CONSTRAINT "order_operational_work_order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_operational_work_order_event" ADD CONSTRAINT "order_operational_work_order_event_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "order_operational_work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_operational_work_order_event" ADD CONSTRAINT "order_operational_work_order_event_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_operational_work_order_event" ADD CONSTRAINT "order_operational_work_order_event_fromInstallerId_fkey" FOREIGN KEY ("fromInstallerId") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_operational_work_order_event" ADD CONSTRAINT "order_operational_work_order_event_toInstallerId_fkey" FOREIGN KEY ("toInstallerId") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
