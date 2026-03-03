CREATE TYPE "notification_type" AS ENUM (
  'ORDER_CONFIRMED',
  'SALES_REVIEW_APPROVED',
  'SALES_REVIEW_CHANGES_REQUESTED',
  'DESIGN_PROOF_PUBLISHED',
  'DESIGN_RESPONSE_APPROVED',
  'DESIGN_RESPONSE_CHANGES_REQUESTED',
  'PRINT_STARTED',
  'PRINT_COMPLETED'
);

CREATE TABLE "user_notification" (
  "id" TEXT NOT NULL,
  "userProfileId" TEXT NOT NULL,
  "organizationId" TEXT,
  "orderId" TEXT,
  "type" "notification_type" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "actionPath" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "sourceKey" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_notification_userProfileId_sourceKey_key"
  ON "user_notification"("userProfileId", "sourceKey");

CREATE INDEX "user_notification_userProfileId_isRead_idx"
  ON "user_notification"("userProfileId", "isRead");

CREATE INDEX "user_notification_userProfileId_createdAt_idx"
  ON "user_notification"("userProfileId", "createdAt");

CREATE INDEX "user_notification_orderId_createdAt_idx"
  ON "user_notification"("orderId", "createdAt");

ALTER TABLE "user_notification"
  ADD CONSTRAINT "user_notification_userProfileId_fkey"
  FOREIGN KEY ("userProfileId") REFERENCES "user_profile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_notification"
  ADD CONSTRAINT "user_notification_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_notification"
  ADD CONSTRAINT "user_notification_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "order"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
