-- AlterTable
ALTER TABLE "order" ALTER COLUMN "code" SET DEFAULT concat('ORD-', lpad(cast(nextval('order_code_seq') as text), 6, '0'));

-- CreateTable
CREATE TABLE "user_notification_preference" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "type" "notification_type" NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notification_preference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_notification_preference_userProfileId_idx" ON "user_notification_preference"("userProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_preference_userProfileId_type_key" ON "user_notification_preference"("userProfileId", "type");

-- AddForeignKey
ALTER TABLE "user_notification_preference" ADD CONSTRAINT "user_notification_preference_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
