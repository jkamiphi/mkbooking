-- CreateEnum
CREATE TYPE "organization_relationship_type" AS ENUM ('AGENCY_CLIENT');

-- CreateEnum
CREATE TYPE "organization_relationship_status" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "catalog_hold"
ADD COLUMN "actingAgencyOrganizationId" TEXT;

-- AlterTable
ALTER TABLE "campaign_request"
ADD COLUMN "actingAgencyOrganizationId" TEXT;

-- AlterTable
ALTER TABLE "order"
ADD COLUMN "actingAgencyOrganizationId" TEXT;

-- CreateTable
CREATE TABLE "organization_relationship" (
    "id" TEXT NOT NULL,
    "sourceOrganizationId" TEXT NOT NULL,
    "targetOrganizationId" TEXT NOT NULL,
    "relationshipType" "organization_relationship_type" NOT NULL,
    "status" "organization_relationship_status" NOT NULL DEFAULT 'PENDING',
    "canCreateRequests" BOOLEAN NOT NULL DEFAULT true,
    "canCreateOrders" BOOLEAN NOT NULL DEFAULT true,
    "canViewBilling" BOOLEAN NOT NULL DEFAULT false,
    "canManageContacts" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "organization_relationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalog_hold_actingAgencyOrganizationId_idx" ON "catalog_hold"("actingAgencyOrganizationId");

-- CreateIndex
CREATE INDEX "campaign_request_actingAgencyOrganizationId_idx" ON "campaign_request"("actingAgencyOrganizationId");

-- CreateIndex
CREATE INDEX "order_actingAgencyOrganizationId_idx" ON "order"("actingAgencyOrganizationId");

-- CreateIndex
CREATE INDEX "organization_relationship_sourceOrganizationId_idx" ON "organization_relationship"("sourceOrganizationId");

-- CreateIndex
CREATE INDEX "organization_relationship_targetOrganizationId_idx" ON "organization_relationship"("targetOrganizationId");

-- CreateIndex
CREATE INDEX "organization_relationship_relationshipType_idx" ON "organization_relationship"("relationshipType");

-- CreateIndex
CREATE INDEX "organization_relationship_status_idx" ON "organization_relationship"("status");

-- CreateIndex
CREATE UNIQUE INDEX "organization_relationship_sourceOrganizationId_targetOrganizationId_relationshipType_key"
ON "organization_relationship"("sourceOrganizationId", "targetOrganizationId", "relationshipType");

-- AddForeignKey
ALTER TABLE "catalog_hold"
ADD CONSTRAINT "catalog_hold_actingAgencyOrganizationId_fkey"
FOREIGN KEY ("actingAgencyOrganizationId") REFERENCES "organization"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_request"
ADD CONSTRAINT "campaign_request_actingAgencyOrganizationId_fkey"
FOREIGN KEY ("actingAgencyOrganizationId") REFERENCES "organization"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order"
ADD CONSTRAINT "order_actingAgencyOrganizationId_fkey"
FOREIGN KEY ("actingAgencyOrganizationId") REFERENCES "organization"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_relationship"
ADD CONSTRAINT "organization_relationship_sourceOrganizationId_fkey"
FOREIGN KEY ("sourceOrganizationId") REFERENCES "organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_relationship"
ADD CONSTRAINT "organization_relationship_targetOrganizationId_fkey"
FOREIGN KEY ("targetOrganizationId") REFERENCES "organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
