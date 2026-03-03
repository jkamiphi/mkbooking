-- AlterTable
ALTER TABLE "order" ALTER COLUMN "code" SET DEFAULT concat('ORD-', lpad(cast(nextval('order_code_seq') as text), 6, '0'));

-- RenameIndex
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class
    WHERE relkind = 'i'
      AND relname = 'order_operational_work_order_evidence_workOrderId_receivedAt_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_class
    WHERE relkind = 'i'
      AND relname = 'order_operational_work_order_evidence_workOrderId_receivedA_idx'
  ) THEN
    ALTER INDEX "order_operational_work_order_evidence_workOrderId_receivedAt_id"
      RENAME TO "order_operational_work_order_evidence_workOrderId_receivedA_idx";
  END IF;
END $$;
