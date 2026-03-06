-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "notification_type" ADD VALUE 'INSTALLATION_SUBMITTED';
ALTER TYPE "notification_type" ADD VALUE 'INSTALLATION_REPORT_ISSUED';

-- AlterTable
ALTER TABLE "order" ALTER COLUMN "code" SET DEFAULT concat('ORD-', lpad(cast(nextval('order_code_seq') as text), 6, '0'));
