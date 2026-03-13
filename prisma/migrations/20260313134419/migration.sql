-- AlterTable
ALTER TABLE "order" ALTER COLUMN "code" SET DEFAULT concat('ORD-', lpad(cast(nextval('order_code_seq') as text), 6, '0'));

-- RenameIndex
ALTER INDEX "organization_relationship_sourceOrganizationId_targetOrganizati" RENAME TO "organization_relationship_sourceOrganizationId_targetOrgani_key";
