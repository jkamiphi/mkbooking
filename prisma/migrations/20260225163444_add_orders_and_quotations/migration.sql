CREATE SEQUENCE IF NOT EXISTS order_code_seq;

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('draft', 'quotation_sent', 'client_approved', 'confirmed', 'cancelled');

-- AlterEnum
ALTER TYPE "campaign_request_status" ADD VALUE 'quotation_generated';

-- CreateTable
CREATE TABLE "order" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT concat('ORD-', lpad(cast(nextval('order_code_seq') as text), 6, '0')),
    "campaignRequestId" TEXT,
    "organizationId" TEXT,
    "createdById" TEXT,
    "clientName" TEXT,
    "clientEmail" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subTotal" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "fromDate" DATE,
    "toDate" DATE,
    "notes" TEXT,
    "status" "order_status" NOT NULL DEFAULT 'draft',
    "clientApprovedAt" TIMESTAMP(3),
    "companyConfirmedAt" TIMESTAMP(3),
    "companyConfirmedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_line_item" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "faceId" TEXT NOT NULL,
    "priceDaily" DECIMAL(12,2) NOT NULL,
    "days" INTEGER NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_line_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_code_key" ON "order"("code");

-- CreateIndex
CREATE UNIQUE INDEX "order_campaignRequestId_key" ON "order"("campaignRequestId");

-- CreateIndex
CREATE INDEX "order_status_idx" ON "order"("status");

-- CreateIndex
CREATE INDEX "order_organizationId_idx" ON "order"("organizationId");

-- CreateIndex
CREATE INDEX "order_createdById_idx" ON "order"("createdById");

-- CreateIndex
CREATE INDEX "order_campaignRequestId_idx" ON "order"("campaignRequestId");

-- CreateIndex
CREATE INDEX "order_line_item_orderId_idx" ON "order_line_item"("orderId");

-- CreateIndex
CREATE INDEX "order_line_item_faceId_idx" ON "order_line_item"("faceId");

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_campaignRequestId_fkey" FOREIGN KEY ("campaignRequestId") REFERENCES "campaign_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_companyConfirmedById_fkey" FOREIGN KEY ("companyConfirmedById") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line_item" ADD CONSTRAINT "order_line_item_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line_item" ADD CONSTRAINT "order_line_item_faceId_fkey" FOREIGN KEY ("faceId") REFERENCES "asset_face"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
