-- CreateEnum
CREATE TYPE "user_account_type" AS ENUM ('DIRECT_CLIENT', 'AGENCY');

-- AlterTable
ALTER TABLE "user_profile"
ADD COLUMN "accountType" "user_account_type" NOT NULL DEFAULT 'DIRECT_CLIENT';

-- Migrate existing profiles to AGENCY when they already behave as multi-organization/agency operators.
UPDATE "user_profile" up
SET "accountType" = 'AGENCY'
WHERE EXISTS (
    SELECT 1
    FROM "organization_member" om
    JOIN "organization" o ON o."id" = om."organizationId"
    WHERE om."userProfileId" = up."id"
      AND om."isActive" = true
      AND o."isActive" = true
      AND o."organizationType" = 'AGENCY'
)
OR (
    SELECT COUNT(*)
    FROM "organization_member" om
    JOIN "organization" o ON o."id" = om."organizationId"
    WHERE om."userProfileId" = up."id"
      AND om."isActive" = true
      AND o."isActive" = true
) > 1;
