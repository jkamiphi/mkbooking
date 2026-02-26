-- CreateTable
CREATE TABLE "campaign_service" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePrice" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_request_service" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_request_service_pkey" PRIMARY KEY ("id")
);

-- Add constraint
ALTER TABLE "campaign_request_service"
    ADD CONSTRAINT "campaign_request_service_quantity_check" CHECK ("quantity" >= 1);

-- CreateTable
CREATE TABLE "order_service_item" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "requestServiceId" TEXT,
    "serviceId" TEXT,
    "serviceCodeSnapshot" TEXT,
    "serviceNameSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_service_item_pkey" PRIMARY KEY ("id")
);

-- Add constraint
ALTER TABLE "order_service_item"
    ADD CONSTRAINT "order_service_item_quantity_check" CHECK ("quantity" >= 1);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_service_code_key" ON "campaign_service"("code");

-- CreateIndex
CREATE INDEX "campaign_service_isActive_idx" ON "campaign_service"("isActive");

-- CreateIndex
CREATE INDEX "campaign_service_sortOrder_idx" ON "campaign_service"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_request_service_requestId_serviceId_key" ON "campaign_request_service"("requestId", "serviceId");

-- CreateIndex
CREATE INDEX "campaign_request_service_requestId_idx" ON "campaign_request_service"("requestId");

-- CreateIndex
CREATE INDEX "campaign_request_service_serviceId_idx" ON "campaign_request_service"("serviceId");

-- CreateIndex
CREATE INDEX "order_service_item_orderId_idx" ON "order_service_item"("orderId");

-- CreateIndex
CREATE INDEX "order_service_item_requestServiceId_idx" ON "order_service_item"("requestServiceId");

-- CreateIndex
CREATE INDEX "order_service_item_serviceId_idx" ON "order_service_item"("serviceId");

-- AddForeignKey
ALTER TABLE "campaign_request_service" ADD CONSTRAINT "campaign_request_service_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "campaign_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_request_service" ADD CONSTRAINT "campaign_request_service_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "campaign_service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_service_item" ADD CONSTRAINT "order_service_item_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_service_item" ADD CONSTRAINT "order_service_item_requestServiceId_fkey" FOREIGN KEY ("requestServiceId") REFERENCES "campaign_request_service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_service_item" ADD CONSTRAINT "order_service_item_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "campaign_service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
