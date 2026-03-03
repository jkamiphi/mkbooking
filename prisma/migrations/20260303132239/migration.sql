-- AlterTable
ALTER TABLE "order" ALTER COLUMN "code" SET DEFAULT concat('ORD-', lpad(cast(nextval('order_code_seq') as text), 6, '0'));

-- AlterTable
ALTER TABLE "user_notification" ALTER COLUMN "updatedAt" DROP DEFAULT;
