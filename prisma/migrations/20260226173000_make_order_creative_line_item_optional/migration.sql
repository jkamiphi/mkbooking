-- AlterTable
ALTER TABLE "order_creative" ALTER COLUMN "lineItemId" DROP NOT NULL;

-- Data migration:
-- Keep only the most recent creative attached to each line item.
-- Older versions are converted to order-level creatives.
WITH ranked_line_item_creatives AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY "lineItemId"
            ORDER BY "createdAt" DESC, "version" DESC, id DESC
        ) AS row_num
    FROM "order_creative"
    WHERE "lineItemId" IS NOT NULL
)
UPDATE "order_creative" creative
SET "lineItemId" = NULL
FROM ranked_line_item_creatives ranked
WHERE creative.id = ranked.id
  AND ranked.row_num > 1;

-- CreateIndex
CREATE UNIQUE INDEX "order_creative_lineItemId_unique_not_null" ON "order_creative"("lineItemId") WHERE "lineItemId" IS NOT NULL;
