-- Alter operational work order status enum
ALTER TYPE "operational_work_order_status" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';
ALTER TYPE "operational_work_order_status" ADD VALUE IF NOT EXISTS 'REOPENED';

-- Alter operational work order event type enum
ALTER TYPE "operational_work_order_event_type" ADD VALUE IF NOT EXISTS 'SUBMITTED_FOR_REVIEW';
ALTER TYPE "operational_work_order_event_type" ADD VALUE IF NOT EXISTS 'REVIEW_APPROVED';
ALTER TYPE "operational_work_order_event_type" ADD VALUE IF NOT EXISTS 'REOPENED_FOR_REWORK';

-- Alter operational work orders
ALTER TABLE "order_operational_work_order"
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedById" TEXT,
ADD COLUMN "reopenedAt" TIMESTAMP(3),
ADD COLUMN "lastReopenReason" TEXT,
ADD COLUMN "reopenCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill completed work orders as already reviewed
UPDATE "order_operational_work_order"
SET "reviewedAt" = "completedAt"
WHERE "status" = 'COMPLETED'
  AND "completedAt" IS NOT NULL
  AND "reviewedAt" IS NULL;

-- Index and foreign key
CREATE INDEX "order_operational_work_order_reviewedById_idx"
ON "order_operational_work_order"("reviewedById");

ALTER TABLE "order_operational_work_order"
ADD CONSTRAINT "order_operational_work_order_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "user_profile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
