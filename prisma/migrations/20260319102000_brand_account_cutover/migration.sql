-- ============================================================================
-- Brand Account Cutover (direct cut)
-- - ADVERTISER -> DIRECT_CLIENT
-- - Introduce brand + brand_access
-- - Backfill legacy commercial rows to brandId
-- - Replace organization_relationship with brand_access
-- ============================================================================

-- Create new enum for brand access type
CREATE TYPE "brand_access_type" AS ENUM ('OWNER', 'DELEGATED');

-- Reuse existing relationship status enum as brand access status
ALTER TYPE "organization_relationship_status" RENAME TO "brand_access_status";

-- Rename organization type ADVERTISER -> DIRECT_CLIENT
BEGIN;
CREATE TYPE "organization_type_new" AS ENUM ('DIRECT_CLIENT', 'AGENCY', 'MEDIA_OWNER', 'PLATFORM_ADMIN');
ALTER TABLE "organization"
  ALTER COLUMN "organizationType" TYPE "organization_type_new"
  USING (
    CASE
      WHEN "organizationType"::text = 'ADVERTISER' THEN 'DIRECT_CLIENT'
      ELSE "organizationType"::text
    END::"organization_type_new"
  );
ALTER TYPE "organization_type" RENAME TO "organization_type_old";
ALTER TYPE "organization_type_new" RENAME TO "organization_type";
DROP TYPE "organization_type_old";
COMMIT;

-- New business entities
CREATE TABLE "brand" (
    "id" TEXT NOT NULL,
    "ownerOrganizationId" TEXT,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "tradeName" TEXT,
    "legalEntityType" "legal_entity_type" NOT NULL DEFAULT 'LEGAL_ENTITY',
    "taxId" TEXT,
    "dvCode" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "website" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "industry" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "brand_access" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "accessType" "brand_access_type" NOT NULL DEFAULT 'DELEGATED',
    "status" "brand_access_status" NOT NULL DEFAULT 'ACTIVE',
    "canCreateRequests" BOOLEAN NOT NULL DEFAULT true,
    "canCreateOrders" BOOLEAN NOT NULL DEFAULT true,
    "canViewBilling" BOOLEAN NOT NULL DEFAULT false,
    "canManageContacts" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "brand_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "brand_taxId_key" ON "brand"("taxId");
CREATE INDEX "brand_ownerOrganizationId_idx" ON "brand"("ownerOrganizationId");
CREATE INDEX "brand_isActive_idx" ON "brand"("isActive");
CREATE INDEX "brand_isVerified_idx" ON "brand"("isVerified");
CREATE INDEX "brand_taxId_idx" ON "brand"("taxId");

CREATE INDEX "brand_access_organizationId_idx" ON "brand_access"("organizationId");
CREATE INDEX "brand_access_brandId_idx" ON "brand_access"("brandId");
CREATE INDEX "brand_access_accessType_idx" ON "brand_access"("accessType");
CREATE INDEX "brand_access_status_idx" ON "brand_access"("status");
CREATE UNIQUE INDEX "brand_access_organizationId_brandId_key" ON "brand_access"("organizationId", "brandId");

-- Add new commercial FKs
ALTER TABLE "campaign_request" ADD COLUMN "brandId" TEXT;
ALTER TABLE "catalog_hold" ADD COLUMN "brandId" TEXT;
ALTER TABLE "catalog_price_rule" ADD COLUMN "brandId" TEXT;
ALTER TABLE "order" ADD COLUMN "brandId" TEXT;
ALTER TABLE "user_notification" ADD COLUMN "brandId" TEXT;

-- Preserve order code default expression as defined in schema
ALTER TABLE "order"
  ALTER COLUMN "code" SET DEFAULT concat('ORD-', lpad(cast(nextval('order_code_seq') as text), 6, '0'));

-- --------------------------------------------------------------------------
-- Backfill
-- --------------------------------------------------------------------------

-- 1) Create one brand record per existing organization so legacy organizationId
--    references can be migrated directly to brandId.
INSERT INTO "brand" (
  "id",
  "ownerOrganizationId",
  "name",
  "legalName",
  "tradeName",
  "legalEntityType",
  "taxId",
  "dvCode",
  "email",
  "phone",
  "whatsapp",
  "website",
  "description",
  "logoUrl",
  "industry",
  "isActive",
  "isVerified",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy"
)
SELECT
  o."id",
  CASE
    WHEN o."organizationType" = 'DIRECT_CLIENT' THEN o."id"
    ELSE NULL
  END AS "ownerOrganizationId",
  o."name",
  o."legalName",
  o."tradeName",
  o."legalEntityType",
  o."taxId",
  o."dvCode",
  o."email",
  o."phone",
  o."whatsapp",
  o."website",
  o."description",
  o."logoUrl",
  o."industry",
  o."isActive",
  o."isVerified",
  o."createdAt",
  o."updatedAt",
  o."createdById",
  o."updatedBy"
FROM "organization" o;

-- 2) Move legacy organizationId references to brandId
UPDATE "campaign_request"
SET "brandId" = "organizationId"
WHERE "organizationId" IS NOT NULL;

UPDATE "catalog_hold"
SET "brandId" = "organizationId"
WHERE "organizationId" IS NOT NULL;

UPDATE "catalog_price_rule"
SET "brandId" = "organizationId"
WHERE "organizationId" IS NOT NULL;

UPDATE "order"
SET "brandId" = "organizationId"
WHERE "organizationId" IS NOT NULL;

UPDATE "user_notification"
SET "brandId" = "organizationId"
WHERE "organizationId" IS NOT NULL;

-- 3) Owner brand access (direct client owner org -> owned brand)
INSERT INTO "brand_access" (
  "id",
  "organizationId",
  "brandId",
  "accessType",
  "status",
  "canCreateRequests",
  "canCreateOrders",
  "canViewBilling",
  "canManageContacts",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy"
)
SELECT
  CONCAT('ba_owner_', b."id") AS "id",
  b."ownerOrganizationId" AS "organizationId",
  b."id" AS "brandId",
  'OWNER'::"brand_access_type" AS "accessType",
  'ACTIVE'::"brand_access_status" AS "status",
  true,
  true,
  true,
  true,
  b."createdAt",
  b."updatedAt",
  b."createdBy",
  b."updatedBy"
FROM "brand" b
WHERE b."ownerOrganizationId" IS NOT NULL
ON CONFLICT ("organizationId", "brandId") DO NOTHING;

-- 4) Delegated brand access from previous agency-client relationships
INSERT INTO "brand_access" (
  "id",
  "organizationId",
  "brandId",
  "accessType",
  "status",
  "canCreateRequests",
  "canCreateOrders",
  "canViewBilling",
  "canManageContacts",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy"
)
SELECT
  CONCAT('ba_rel_', r."id") AS "id",
  r."sourceOrganizationId" AS "organizationId",
  r."targetOrganizationId" AS "brandId",
  'DELEGATED'::"brand_access_type" AS "accessType",
  r."status"::"brand_access_status" AS "status",
  r."canCreateRequests",
  r."canCreateOrders",
  r."canViewBilling",
  r."canManageContacts",
  r."createdAt",
  r."updatedAt",
  r."createdById",
  r."updatedBy"
FROM "organization_relationship" r
WHERE r."relationshipType" = 'AGENCY_CLIENT'
ON CONFLICT ("organizationId", "brandId") DO NOTHING;

-- New indexes and foreign keys on brandId
CREATE INDEX "campaign_request_brandId_idx" ON "campaign_request"("brandId");
CREATE INDEX "catalog_hold_brandId_idx" ON "catalog_hold"("brandId");
CREATE INDEX "catalog_price_rule_brandId_idx" ON "catalog_price_rule"("brandId");
CREATE INDEX "order_brandId_idx" ON "order"("brandId");

ALTER TABLE "brand"
  ADD CONSTRAINT "brand_ownerOrganizationId_fkey"
  FOREIGN KEY ("ownerOrganizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "brand_access"
  ADD CONSTRAINT "brand_access_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "brand_access"
  ADD CONSTRAINT "brand_access_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "catalog_price_rule"
  ADD CONSTRAINT "catalog_price_rule_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "catalog_hold"
  ADD CONSTRAINT "catalog_hold_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "campaign_request"
  ADD CONSTRAINT "campaign_request_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order"
  ADD CONSTRAINT "order_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_notification"
  ADD CONSTRAINT "user_notification_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Remove legacy commercial source columns/relationships
ALTER TABLE "campaign_request" DROP CONSTRAINT "campaign_request_organizationId_fkey";
ALTER TABLE "catalog_hold" DROP CONSTRAINT "catalog_hold_organizationId_fkey";
ALTER TABLE "catalog_price_rule" DROP CONSTRAINT "catalog_price_rule_organizationId_fkey";
ALTER TABLE "order" DROP CONSTRAINT "order_organizationId_fkey";
ALTER TABLE "user_notification" DROP CONSTRAINT "user_notification_organizationId_fkey";
ALTER TABLE "organization_relationship" DROP CONSTRAINT "organization_relationship_sourceOrganizationId_fkey";
ALTER TABLE "organization_relationship" DROP CONSTRAINT "organization_relationship_targetOrganizationId_fkey";

DROP INDEX "campaign_request_organizationId_idx";
DROP INDEX "catalog_hold_organizationId_idx";
DROP INDEX "catalog_price_rule_organizationId_idx";
DROP INDEX "order_organizationId_idx";

ALTER TABLE "campaign_request" DROP COLUMN "organizationId";
ALTER TABLE "catalog_hold" DROP COLUMN "organizationId";
ALTER TABLE "catalog_price_rule" DROP COLUMN "organizationId";
ALTER TABLE "order" DROP COLUMN "organizationId";
ALTER TABLE "user_notification" DROP COLUMN "organizationId";

DROP TABLE "organization_relationship";
DROP TYPE "organization_relationship_type";
