-- CreateEnum
CREATE TYPE "land_tenure" AS ENUM ('SERVIDUMBRE', 'PRIVADO', 'ESTATAL', 'OTRO');

-- AlterTable
ALTER TABLE "asset" ADD COLUMN     "assetTaxMonthly" DECIMAL(12,2),
ADD COLUMN     "electricityCostMonthly" DECIMAL(12,2),
ADD COLUMN     "landRentMonthly" DECIMAL(12,2),
ADD COLUMN     "landTenure" "land_tenure",
ADD COLUMN     "municipality" TEXT,
ADD COLUMN     "pedestrianTrafficMonthly" INTEGER,
ADD COLUMN     "vehicleTrafficMonthly" INTEGER;

-- AlterTable
ALTER TABLE "asset_face" ADD COLUMN     "productionCostMonthly" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "order" ALTER COLUMN "code" SET DEFAULT concat('ORD-', lpad(cast(nextval('order_code_seq') as text), 6, '0'));
