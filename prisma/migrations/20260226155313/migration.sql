-- CreateEnum
CREATE TYPE "creative_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "order" ALTER COLUMN "code" SET DEFAULT concat('ORD-', lpad(cast(nextval('order_code_seq') as text), 6, '0'));

-- CreateTable
CREATE TABLE "order_creative" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "lineItemId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "creative_status" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "uploadedById" TEXT,

    CONSTRAINT "order_creative_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_creative_orderId_idx" ON "order_creative"("orderId");

-- CreateIndex
CREATE INDEX "order_creative_lineItemId_idx" ON "order_creative"("lineItemId");

-- AddForeignKey
ALTER TABLE "order_creative" ADD CONSTRAINT "order_creative_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_creative" ADD CONSTRAINT "order_creative_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "order_line_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_creative" ADD CONSTRAINT "order_creative_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
