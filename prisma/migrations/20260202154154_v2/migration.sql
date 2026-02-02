-- CreateEnum
CREATE TYPE "system_role" AS ENUM ('SUPERADMIN', 'STAFF', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "organization_type" AS ENUM ('ADVERTISER', 'AGENCY', 'MEDIA_OWNER', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "legal_entity_type" AS ENUM ('NATURAL_PERSON', 'LEGAL_ENTITY');

-- CreateEnum
CREATE TYPE "organization_role" AS ENUM ('OWNER', 'ADMIN', 'SALES', 'OPERATIONS', 'FINANCE', 'VIEWER', 'CLIENT_VIEWER');

-- CreateEnum
CREATE TYPE "asset_status" AS ENUM ('active', 'inactive', 'maintenance', 'retired');

-- CreateEnum
CREATE TYPE "asset_face_status" AS ENUM ('active', 'inactive', 'maintenance', 'retired');

-- CreateEnum
CREATE TYPE "asset_face_facing" AS ENUM ('traffic', 'opposite_traffic');

-- CreateEnum
CREATE TYPE "catalog_promo_type" AS ENUM ('percent', 'fixed');

-- CreateEnum
CREATE TYPE "catalog_hold_status" AS ENUM ('active', 'expired', 'released', 'converted');

-- CreateEnum
CREATE TYPE "contact_role" AS ENUM ('PRIMARY', 'BILLING', 'OPERATIONS', 'LEGAL', 'TECHNICAL', 'EMERGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('TAX_CERTIFICATE', 'LEGAL_REGISTRATION', 'ID_DOCUMENT', 'POWER_OF_ATTORNEY', 'TAX_EXEMPTION', 'BANK_REFERENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'INVITE_USER', 'REMOVE_USER', 'CHANGE_ROLE', 'VERIFY_DOCUMENT', 'APPROVE', 'REJECT', 'CANCEL');

-- CreateTable
CREATE TABLE "user_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "systemRole" "system_role" NOT NULL DEFAULT 'CUSTOMER',
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'es-PA',
    "timezone" TEXT NOT NULL DEFAULT 'America/Panama',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "whatsappNotifications" BOOLEAN NOT NULL DEFAULT false,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "tradeName" TEXT,
    "organizationType" "organization_type" NOT NULL,
    "legalEntityType" "legal_entity_type" NOT NULL,
    "taxId" TEXT,
    "dvCode" TEXT,
    "cedula" TEXT,
    "passportNumber" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "website" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "province" TEXT,
    "country" TEXT NOT NULL DEFAULT 'PA',
    "postalCode" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "industry" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "role" "organization_role" NOT NULL,
    "permissions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "invitedBy" TEXT,

    CONSTRAINT "organization_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "province" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "province_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provinceId" TEXT NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "structure_type" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "structure_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_type" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "road_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "structureTypeId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "roadTypeId" TEXT,
    "address" TEXT NOT NULL,
    "landmark" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "illuminated" BOOLEAN NOT NULL DEFAULT false,
    "digital" BOOLEAN NOT NULL DEFAULT false,
    "powered" BOOLEAN NOT NULL DEFAULT false,
    "hasPrintService" BOOLEAN NOT NULL DEFAULT false,
    "status" "asset_status" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "installedDate" DATE,
    "retiredDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "face_position" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "face_position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_face" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "positionId" TEXT,
    "width" DECIMAL(6,2) NOT NULL,
    "height" DECIMAL(6,2) NOT NULL,
    "facing" "asset_face_facing" NOT NULL DEFAULT 'traffic',
    "visibilityNotes" TEXT,
    "status" "asset_face_status" NOT NULL DEFAULT 'active',
    "restrictions" TEXT,
    "notes" TEXT,

    CONSTRAINT "asset_face_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_image" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "caption" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_face_image" (
    "id" TEXT NOT NULL,
    "faceId" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "caption" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_face_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mounting_type" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "mounting_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_spec" (
    "id" TEXT NOT NULL,
    "faceId" TEXT NOT NULL,
    "mountingTypeId" TEXT,
    "material" TEXT,
    "bleedCm" DECIMAL(5,2),
    "safeMarginCm" DECIMAL(5,2),
    "dpiRecommended" INTEGER,
    "fileFormat" TEXT,
    "installNotes" TEXT,
    "uninstallNotes" TEXT,

    CONSTRAINT "production_spec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permit" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "faceId" TEXT,
    "permitNumber" TEXT,
    "authority" TEXT,
    "issuedDate" DATE,
    "expiresDate" DATE,
    "document" TEXT,
    "notes" TEXT,

    CONSTRAINT "permit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restriction_tag" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "restriction_tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_face_restriction" (
    "id" TEXT NOT NULL,
    "faceId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "asset_face_restriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_window" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "faceId" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "maintenance_window_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_face" (
    "id" TEXT NOT NULL,
    "faceId" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "highlight" TEXT,
    "primaryImageUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_face_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_price_rule" (
    "id" TEXT NOT NULL,
    "faceId" TEXT,
    "structureTypeId" TEXT,
    "zoneId" TEXT,
    "organizationId" TEXT,
    "priceDaily" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_price_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_promo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "catalog_promo_type" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_promo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_hold" (
    "id" TEXT NOT NULL,
    "faceId" TEXT NOT NULL,
    "organizationId" TEXT,
    "createdById" TEXT,
    "status" "catalog_hold_status" NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_hold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_contact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "contactRole" "contact_role" NOT NULL,
    "title" TEXT,
    "department" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "receiveNotifications" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "organization_contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentType" "document_type" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "documentNumber" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "uploadedBy" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "organization_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorName" TEXT,
    "action" "audit_action" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "description" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_userId_key" ON "user_profile"("userId");

-- CreateIndex
CREATE INDEX "user_profile_userId_idx" ON "user_profile"("userId");

-- CreateIndex
CREATE INDEX "user_profile_isActive_idx" ON "user_profile"("isActive");

-- CreateIndex
CREATE INDEX "user_profile_systemRole_idx" ON "user_profile"("systemRole");

-- CreateIndex
CREATE UNIQUE INDEX "organization_taxId_key" ON "organization"("taxId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_cedula_key" ON "organization"("cedula");

-- CreateIndex
CREATE INDEX "organization_organizationType_idx" ON "organization"("organizationType");

-- CreateIndex
CREATE INDEX "organization_isActive_idx" ON "organization"("isActive");

-- CreateIndex
CREATE INDEX "organization_taxId_idx" ON "organization"("taxId");

-- CreateIndex
CREATE INDEX "organization_cedula_idx" ON "organization"("cedula");

-- CreateIndex
CREATE INDEX "organization_createdById_idx" ON "organization"("createdById");

-- CreateIndex
CREATE INDEX "organization_member_organizationId_idx" ON "organization_member"("organizationId");

-- CreateIndex
CREATE INDEX "organization_member_userProfileId_idx" ON "organization_member"("userProfileId");

-- CreateIndex
CREATE INDEX "organization_member_role_idx" ON "organization_member"("role");

-- CreateIndex
CREATE INDEX "organization_member_isActive_idx" ON "organization_member"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "organization_member_organizationId_userProfileId_key" ON "organization_member"("organizationId", "userProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "province_name_key" ON "province"("name");

-- CreateIndex
CREATE INDEX "zone_provinceId_idx" ON "zone"("provinceId");

-- CreateIndex
CREATE UNIQUE INDEX "zone_provinceId_name_key" ON "zone"("provinceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "structure_type_name_key" ON "structure_type"("name");

-- CreateIndex
CREATE UNIQUE INDEX "road_type_name_key" ON "road_type"("name");

-- CreateIndex
CREATE UNIQUE INDEX "asset_code_key" ON "asset"("code");

-- CreateIndex
CREATE INDEX "asset_structureTypeId_idx" ON "asset"("structureTypeId");

-- CreateIndex
CREATE INDEX "asset_zoneId_idx" ON "asset"("zoneId");

-- CreateIndex
CREATE INDEX "asset_roadTypeId_idx" ON "asset"("roadTypeId");

-- CreateIndex
CREATE INDEX "asset_status_idx" ON "asset"("status");

-- CreateIndex
CREATE UNIQUE INDEX "face_position_name_key" ON "face_position"("name");

-- CreateIndex
CREATE INDEX "asset_face_assetId_idx" ON "asset_face"("assetId");

-- CreateIndex
CREATE INDEX "asset_face_positionId_idx" ON "asset_face"("positionId");

-- CreateIndex
CREATE INDEX "asset_face_status_idx" ON "asset_face"("status");

-- CreateIndex
CREATE UNIQUE INDEX "asset_face_assetId_code_key" ON "asset_face"("assetId", "code");

-- CreateIndex
CREATE INDEX "asset_image_assetId_idx" ON "asset_image"("assetId");

-- CreateIndex
CREATE INDEX "asset_image_isPrimary_idx" ON "asset_image"("isPrimary");

-- CreateIndex
CREATE INDEX "asset_face_image_faceId_idx" ON "asset_face_image"("faceId");

-- CreateIndex
CREATE INDEX "asset_face_image_isPrimary_idx" ON "asset_face_image"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "mounting_type_name_key" ON "mounting_type"("name");

-- CreateIndex
CREATE UNIQUE INDEX "production_spec_faceId_key" ON "production_spec"("faceId");

-- CreateIndex
CREATE INDEX "production_spec_mountingTypeId_idx" ON "production_spec"("mountingTypeId");

-- CreateIndex
CREATE INDEX "permit_assetId_idx" ON "permit"("assetId");

-- CreateIndex
CREATE INDEX "permit_faceId_idx" ON "permit"("faceId");

-- CreateIndex
CREATE UNIQUE INDEX "restriction_tag_code_key" ON "restriction_tag"("code");

-- CreateIndex
CREATE INDEX "asset_face_restriction_faceId_idx" ON "asset_face_restriction"("faceId");

-- CreateIndex
CREATE INDEX "asset_face_restriction_tagId_idx" ON "asset_face_restriction"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_face_restriction_faceId_tagId_key" ON "asset_face_restriction"("faceId", "tagId");

-- CreateIndex
CREATE INDEX "maintenance_window_assetId_idx" ON "maintenance_window"("assetId");

-- CreateIndex
CREATE INDEX "maintenance_window_faceId_idx" ON "maintenance_window"("faceId");

-- CreateIndex
CREATE INDEX "maintenance_window_startDate_idx" ON "maintenance_window"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_face_faceId_key" ON "catalog_face"("faceId");

-- CreateIndex
CREATE INDEX "catalog_face_isPublished_idx" ON "catalog_face"("isPublished");

-- CreateIndex
CREATE INDEX "catalog_price_rule_faceId_idx" ON "catalog_price_rule"("faceId");

-- CreateIndex
CREATE INDEX "catalog_price_rule_structureTypeId_idx" ON "catalog_price_rule"("structureTypeId");

-- CreateIndex
CREATE INDEX "catalog_price_rule_zoneId_idx" ON "catalog_price_rule"("zoneId");

-- CreateIndex
CREATE INDEX "catalog_price_rule_organizationId_idx" ON "catalog_price_rule"("organizationId");

-- CreateIndex
CREATE INDEX "catalog_price_rule_isActive_idx" ON "catalog_price_rule"("isActive");

-- CreateIndex
CREATE INDEX "catalog_price_rule_startDate_idx" ON "catalog_price_rule"("startDate");

-- CreateIndex
CREATE INDEX "catalog_promo_isActive_idx" ON "catalog_promo"("isActive");

-- CreateIndex
CREATE INDEX "catalog_promo_startDate_idx" ON "catalog_promo"("startDate");

-- CreateIndex
CREATE INDEX "catalog_hold_faceId_idx" ON "catalog_hold"("faceId");

-- CreateIndex
CREATE INDEX "catalog_hold_organizationId_idx" ON "catalog_hold"("organizationId");

-- CreateIndex
CREATE INDEX "catalog_hold_status_idx" ON "catalog_hold"("status");

-- CreateIndex
CREATE INDEX "catalog_hold_expiresAt_idx" ON "catalog_hold"("expiresAt");

-- CreateIndex
CREATE INDEX "organization_contact_organizationId_idx" ON "organization_contact"("organizationId");

-- CreateIndex
CREATE INDEX "organization_contact_contactRole_idx" ON "organization_contact"("contactRole");

-- CreateIndex
CREATE INDEX "organization_contact_isPrimary_idx" ON "organization_contact"("isPrimary");

-- CreateIndex
CREATE INDEX "organization_document_organizationId_idx" ON "organization_document"("organizationId");

-- CreateIndex
CREATE INDEX "organization_document_documentType_idx" ON "organization_document"("documentType");

-- CreateIndex
CREATE INDEX "organization_document_expiryDate_idx" ON "organization_document"("expiryDate");

-- CreateIndex
CREATE INDEX "organization_document_isVerified_idx" ON "organization_document"("isVerified");

-- CreateIndex
CREATE INDEX "audit_log_actorId_idx" ON "audit_log"("actorId");

-- CreateIndex
CREATE INDEX "audit_log_entityType_entityId_idx" ON "audit_log"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization" ADD CONSTRAINT "organization_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone" ADD CONSTRAINT "zone_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "province"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_structureTypeId_fkey" FOREIGN KEY ("structureTypeId") REFERENCES "structure_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_roadTypeId_fkey" FOREIGN KEY ("roadTypeId") REFERENCES "road_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_face" ADD CONSTRAINT "asset_face_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_face" ADD CONSTRAINT "asset_face_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "face_position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_image" ADD CONSTRAINT "asset_image_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_face_image" ADD CONSTRAINT "asset_face_image_faceId_fkey" FOREIGN KEY ("faceId") REFERENCES "asset_face"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_spec" ADD CONSTRAINT "production_spec_faceId_fkey" FOREIGN KEY ("faceId") REFERENCES "asset_face"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_spec" ADD CONSTRAINT "production_spec_mountingTypeId_fkey" FOREIGN KEY ("mountingTypeId") REFERENCES "mounting_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit" ADD CONSTRAINT "permit_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit" ADD CONSTRAINT "permit_faceId_fkey" FOREIGN KEY ("faceId") REFERENCES "asset_face"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_face_restriction" ADD CONSTRAINT "asset_face_restriction_faceId_fkey" FOREIGN KEY ("faceId") REFERENCES "asset_face"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_face_restriction" ADD CONSTRAINT "asset_face_restriction_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "restriction_tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_window" ADD CONSTRAINT "maintenance_window_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_window" ADD CONSTRAINT "maintenance_window_faceId_fkey" FOREIGN KEY ("faceId") REFERENCES "asset_face"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_face" ADD CONSTRAINT "catalog_face_faceId_fkey" FOREIGN KEY ("faceId") REFERENCES "asset_face"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_price_rule" ADD CONSTRAINT "catalog_price_rule_faceId_fkey" FOREIGN KEY ("faceId") REFERENCES "catalog_face"("faceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_price_rule" ADD CONSTRAINT "catalog_price_rule_structureTypeId_fkey" FOREIGN KEY ("structureTypeId") REFERENCES "structure_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_price_rule" ADD CONSTRAINT "catalog_price_rule_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_price_rule" ADD CONSTRAINT "catalog_price_rule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_hold" ADD CONSTRAINT "catalog_hold_faceId_fkey" FOREIGN KEY ("faceId") REFERENCES "catalog_face"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_hold" ADD CONSTRAINT "catalog_hold_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_hold" ADD CONSTRAINT "catalog_hold_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_contact" ADD CONSTRAINT "organization_contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_document" ADD CONSTRAINT "organization_document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
