-- AlterEnum
ALTER TYPE "order_design_task_event_type" ADD VALUE IF NOT EXISTS 'DESIGNER_APPROVED';
ALTER TYPE "order_design_task_event_type" ADD VALUE IF NOT EXISTS 'DESIGNER_CHANGES_REQUESTED';

-- AlterTable
ALTER TABLE "order_design_task"
  ADD COLUMN "designerApprovedProofVersion" INTEGER,
  ADD COLUMN "clientApprovedProofVersion" INTEGER;

-- Backfill approvals for closed tasks that already have proofs
UPDATE "order_design_task" dt
SET
  "designerApprovedProofVersion" = proof."maxVersion",
  "clientApprovedProofVersion" = proof."maxVersion"
FROM (
  SELECT
    oc."orderId",
    MAX(oc."version")::INTEGER AS "maxVersion"
  FROM "order_creative" oc
  WHERE oc."creativeKind" = 'DESIGN_PROOF'
  GROUP BY oc."orderId"
) proof
WHERE dt."orderId" = proof."orderId"
  AND dt."closedAt" IS NOT NULL;

-- Backfill open tasks: keep client approval pending and set designer version if a proof exists
UPDATE "order_design_task" dt
SET
  "designerApprovedProofVersion" = COALESCE(dt."designerApprovedProofVersion", proof."maxVersion"),
  "clientApprovedProofVersion" = NULL
FROM (
  SELECT
    oc."orderId",
    MAX(oc."version")::INTEGER AS "maxVersion"
  FROM "order_creative" oc
  WHERE oc."creativeKind" = 'DESIGN_PROOF'
  GROUP BY oc."orderId"
) proof
WHERE dt."orderId" = proof."orderId"
  AND dt."closedAt" IS NULL;
