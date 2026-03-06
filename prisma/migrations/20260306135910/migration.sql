-- AlterTable
ALTER TABLE "order" ALTER COLUMN "code" SET DEFAULT concat('ORD-', lpad(cast(nextval('order_code_seq') as text), 6, '0'));

-- RenameIndex
ALTER INDEX "order_operational_work_order_evidence_workOrderId_receivedAt_id" RENAME TO "order_operational_work_order_evidence_workOrderId_receivedA_idx";
