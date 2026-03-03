-- CreateTable
CREATE TABLE "order_operational_checklist_item" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3),
    "checkedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_operational_checklist_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_operational_work_order_evidence" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedLatitude" DECIMAL(9,6),
    "capturedLongitude" DECIMAL(9,6),
    "expectedLatitude" DECIMAL(9,6),
    "expectedLongitude" DECIMAL(9,6),
    "distanceMeters" DECIMAL(10,2),
    "withinExpectedRadius" BOOLEAN,
    "radiusMeters" INTEGER NOT NULL DEFAULT 250,
    "geoOverrideReason" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_operational_work_order_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_operational_checklist_item_workOrderId_code_key" ON "order_operational_checklist_item"("workOrderId", "code");

-- CreateIndex
CREATE INDEX "order_operational_checklist_item_workOrderId_idx" ON "order_operational_checklist_item"("workOrderId");

-- CreateIndex
CREATE INDEX "order_operational_checklist_item_isChecked_idx" ON "order_operational_checklist_item"("isChecked");

-- CreateIndex
CREATE INDEX "order_operational_checklist_item_checkedById_idx" ON "order_operational_checklist_item"("checkedById");

-- CreateIndex
CREATE INDEX "order_operational_work_order_evidence_workOrderId_receivedAt_idx" ON "order_operational_work_order_evidence"("workOrderId", "receivedAt");

-- CreateIndex
CREATE INDEX "order_operational_work_order_evidence_uploadedById_idx" ON "order_operational_work_order_evidence"("uploadedById");

-- CreateIndex
CREATE INDEX "order_operational_work_order_evidence_withinExpectedRadius_idx" ON "order_operational_work_order_evidence"("withinExpectedRadius");

-- AddForeignKey
ALTER TABLE "order_operational_checklist_item" ADD CONSTRAINT "order_operational_checklist_item_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "order_operational_work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_operational_checklist_item" ADD CONSTRAINT "order_operational_checklist_item_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_operational_work_order_evidence" ADD CONSTRAINT "order_operational_work_order_evidence_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "order_operational_work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_operational_work_order_evidence" ADD CONSTRAINT "order_operational_work_order_evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
