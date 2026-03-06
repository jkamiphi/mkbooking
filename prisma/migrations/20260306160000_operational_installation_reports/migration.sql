CREATE TYPE "operational_installation_report_status" AS ENUM (
    'ISSUED',
    'SUPERSEDED'
);

ALTER TABLE "order"
ADD COLUMN "operationsClosedAt" TIMESTAMP(3),
ADD COLUMN "operationsClosedById" TEXT,
ADD COLUMN "caseFileArchivedAt" TIMESTAMP(3),
ADD COLUMN "caseFileArchivedById" TEXT;

CREATE INDEX "order_operationsClosedById_idx"
ON "order"("operationsClosedById");

CREATE INDEX "order_caseFileArchivedById_idx"
ON "order"("caseFileArchivedById");

ALTER TABLE "order"
ADD CONSTRAINT "order_operationsClosedById_fkey"
FOREIGN KEY ("operationsClosedById") REFERENCES "user_profile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order"
ADD CONSTRAINT "order_caseFileArchivedById_fkey"
FOREIGN KEY ("caseFileArchivedById") REFERENCES "user_profile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "order_operational_installation_report" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "operational_installation_report_status" NOT NULL DEFAULT 'ISSUED',
    "reviewNotes" TEXT,
    "snapshot" JSONB NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById" TEXT,
    "supersededAt" TIMESTAMP(3),
    "supersededById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_operational_installation_report_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_operational_installation_report_workOrderId_version_key"
ON "order_operational_installation_report"("workOrderId", "version");

CREATE INDEX "order_operational_installation_report_orderId_issuedAt_idx"
ON "order_operational_installation_report"("orderId", "issuedAt");

CREATE INDEX "order_operational_installation_report_workOrderId_status_idx"
ON "order_operational_installation_report"("workOrderId", "status");

CREATE INDEX "order_operational_installation_report_issuedById_idx"
ON "order_operational_installation_report"("issuedById");

CREATE INDEX "order_operational_installation_report_supersededById_idx"
ON "order_operational_installation_report"("supersededById");

ALTER TABLE "order_operational_installation_report"
ADD CONSTRAINT "order_operational_installation_report_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_operational_installation_report"
ADD CONSTRAINT "order_operational_installation_report_workOrderId_fkey"
FOREIGN KEY ("workOrderId") REFERENCES "order_operational_work_order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_operational_installation_report"
ADD CONSTRAINT "order_operational_installation_report_issuedById_fkey"
FOREIGN KEY ("issuedById") REFERENCES "user_profile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_operational_installation_report"
ADD CONSTRAINT "order_operational_installation_report_supersededById_fkey"
FOREIGN KEY ("supersededById") REFERENCES "user_profile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
