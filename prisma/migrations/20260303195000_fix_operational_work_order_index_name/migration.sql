-- Align index name with historical environments where Prisma truncated and later renamed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class
    WHERE relkind = 'i'
      AND relname = 'order_operational_work_order_printTaskId_lineItemId_printTaskCo'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_class
    WHERE relkind = 'i'
      AND relname = 'order_operational_work_order_printTaskId_lineItemId_printTa_key'
  ) THEN
    ALTER INDEX "order_operational_work_order_printTaskId_lineItemId_printTaskCo"
      RENAME TO "order_operational_work_order_printTaskId_lineItemId_printTa_key";
  END IF;
END $$;
