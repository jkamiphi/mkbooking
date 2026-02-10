-- CreateEnum
CREATE TYPE "campaign_request_status" AS ENUM ('new', 'in_review', 'proposal_sent', 'confirmed', 'rejected');

-- CreateTable
CREATE TABLE "campaign_request" (
    "id" TEXT NOT NULL,
    "query" TEXT,
    "zoneId" TEXT,
    "structureTypeId" TEXT,
    "quantity" INTEGER NOT NULL,
    "fromDate" DATE,
    "toDate" DATE,
    "notes" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "organizationId" TEXT,
    "createdById" TEXT,
    "status" "campaign_request_status" NOT NULL DEFAULT 'new',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_request_face_assignment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "faceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_request_face_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_request_status_idx" ON "campaign_request"("status");

-- CreateIndex
CREATE INDEX "campaign_request_zoneId_idx" ON "campaign_request"("zoneId");

-- CreateIndex
CREATE INDEX "campaign_request_structureTypeId_idx" ON "campaign_request"("structureTypeId");

-- CreateIndex
CREATE INDEX "campaign_request_organizationId_idx" ON "campaign_request"("organizationId");

-- CreateIndex
CREATE INDEX "campaign_request_createdById_idx" ON "campaign_request"("createdById");

-- CreateIndex
CREATE INDEX "campaign_request_createdAt_idx" ON "campaign_request"("createdAt");

-- CreateIndex
CREATE INDEX "campaign_request_face_assignment_requestId_idx" ON "campaign_request_face_assignment"("requestId");

-- CreateIndex
CREATE INDEX "campaign_request_face_assignment_faceId_idx" ON "campaign_request_face_assignment"("faceId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_request_face_assignment_requestId_faceId_key" ON "campaign_request_face_assignment"("requestId", "faceId");

-- AddForeignKey
ALTER TABLE "campaign_request" ADD CONSTRAINT "campaign_request_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_request" ADD CONSTRAINT "campaign_request_structureTypeId_fkey" FOREIGN KEY ("structureTypeId") REFERENCES "structure_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_request" ADD CONSTRAINT "campaign_request_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_request" ADD CONSTRAINT "campaign_request_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_request" ADD CONSTRAINT "campaign_request_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_request_face_assignment" ADD CONSTRAINT "campaign_request_face_assignment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "campaign_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_request_face_assignment" ADD CONSTRAINT "campaign_request_face_assignment_faceId_fkey" FOREIGN KEY ("faceId") REFERENCES "asset_face"("id") ON DELETE CASCADE ON UPDATE CASCADE;
