-- CreateTable
CREATE TABLE "order_purchase_order" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "uploadedById" TEXT,

    CONSTRAINT "order_purchase_order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_purchase_order_orderId_idx" ON "order_purchase_order"("orderId");

-- AddForeignKey
ALTER TABLE "order_purchase_order" ADD CONSTRAINT "order_purchase_order_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_purchase_order" ADD CONSTRAINT "order_purchase_order_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
