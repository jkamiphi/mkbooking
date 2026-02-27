-- AlterEnum
ALTER TYPE "system_role" ADD VALUE IF NOT EXISTS 'SALES';

-- CreateEnum
CREATE TYPE "sales_review_status" AS ENUM ('NOT_STARTED', 'PENDING_REVIEW', 'APPROVED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "purchase_order_review_status" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "sales_review_event_type" AS ENUM (
    'REVIEW_REQUIRED',
    'DOCUMENT_APPROVED',
    'DOCUMENT_CHANGES_REQUESTED',
    'ORDER_APPROVED',
    'ORDER_CHANGES_REQUESTED',
    'CRITICAL_CHANGE',
    'ORDER_CONFIRMED_WITHOUT_SALES_APPROVAL'
);

-- CreateEnum
CREATE TYPE "sales_review_target_type" AS ENUM ('ORDER', 'CREATIVE', 'PURCHASE_ORDER');

-- CreateEnum
CREATE TYPE "sales_review_result" AS ENUM ('APPROVED', 'CHANGES_REQUESTED');

-- AlterTable
ALTER TABLE "order"
    ADD COLUMN "salesReviewStatus" "sales_review_status" NOT NULL DEFAULT 'NOT_STARTED',
    ADD COLUMN "salesReviewUpdatedAt" TIMESTAMP(3),
    ADD COLUMN "salesReviewById" TEXT,
    ADD COLUMN "salesReviewNotes" TEXT,
    ADD COLUMN "salesReviewVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "order_creative"
    ADD COLUMN "reviewedAt" TIMESTAMP(3),
    ADD COLUMN "reviewedById" TEXT,
    ADD COLUMN "reviewNotes" TEXT;

-- AlterTable
ALTER TABLE "order_purchase_order"
    ADD COLUMN "reviewStatus" "purchase_order_review_status" NOT NULL DEFAULT 'PENDING_REVIEW',
    ADD COLUMN "reviewedAt" TIMESTAMP(3),
    ADD COLUMN "reviewedById" TEXT,
    ADD COLUMN "reviewNotes" TEXT;

-- CreateTable
CREATE TABLE "order_sales_review_event" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventType" "sales_review_event_type" NOT NULL,
    "targetType" "sales_review_target_type" NOT NULL,
    "targetId" TEXT,
    "result" "sales_review_result",
    "notes" TEXT,
    "metadata" JSONB,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_sales_review_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_salesReviewStatus_idx" ON "order"("salesReviewStatus");

-- CreateIndex
CREATE INDEX "order_salesReviewById_idx" ON "order"("salesReviewById");

-- CreateIndex
CREATE INDEX "order_creative_reviewedById_idx" ON "order_creative"("reviewedById");

-- CreateIndex
CREATE INDEX "order_purchase_order_reviewedById_idx" ON "order_purchase_order"("reviewedById");

-- CreateIndex
CREATE INDEX "order_sales_review_event_orderId_idx" ON "order_sales_review_event"("orderId");

-- CreateIndex
CREATE INDEX "order_sales_review_event_actorId_idx" ON "order_sales_review_event"("actorId");

-- CreateIndex
CREATE INDEX "order_sales_review_event_eventType_idx" ON "order_sales_review_event"("eventType");

-- CreateIndex
CREATE INDEX "order_sales_review_event_createdAt_idx" ON "order_sales_review_event"("createdAt");

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_salesReviewById_fkey" FOREIGN KEY ("salesReviewById") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_creative" ADD CONSTRAINT "order_creative_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_purchase_order" ADD CONSTRAINT "order_purchase_order_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_sales_review_event" ADD CONSTRAINT "order_sales_review_event_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_sales_review_event" ADD CONSTRAINT "order_sales_review_event_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: orders with uploaded OC or creatives move to pending review
UPDATE "order" AS o
SET
  "salesReviewStatus" = 'PENDING_REVIEW',
  "salesReviewUpdatedAt" = CURRENT_TIMESTAMP
WHERE EXISTS (
  SELECT 1
  FROM "order_creative" AS c
  WHERE c."orderId" = o."id"
)
OR EXISTS (
  SELECT 1
  FROM "order_purchase_order" AS po
  WHERE po."orderId" = o."id"
);
