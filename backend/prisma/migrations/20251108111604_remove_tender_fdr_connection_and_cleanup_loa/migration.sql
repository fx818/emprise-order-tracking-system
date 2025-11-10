-- DropForeignKey
ALTER TABLE "fdrs" DROP CONSTRAINT IF EXISTS "EMD_tenderId_fkey";

-- DropForeignKey
ALTER TABLE "fdrs" DROP CONSTRAINT IF EXISTS "EMD_loaId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "fdrs_tenderId_idx";

-- DropIndex
DROP INDEX IF EXISTS "fdrs_loaId_idx";

-- Step 1: Delete all FDRs that are linked to tenders
DELETE FROM "fdrs" WHERE "tenderId" IS NOT NULL;

-- Step 2: Remove LOA fields that are now deprecated (replaced by FDR relations)
ALTER TABLE "LOA" DROP COLUMN IF EXISTS "hasPerformanceGuarantee";
ALTER TABLE "LOA" DROP COLUMN IF EXISTS "hasSecurityDeposit";
ALTER TABLE "LOA" DROP COLUMN IF EXISTS "performanceGuaranteeAmount";
ALTER TABLE "LOA" DROP COLUMN IF EXISTS "performanceGuaranteeDocumentUrl";
ALTER TABLE "LOA" DROP COLUMN IF EXISTS "securityDepositAmount";
ALTER TABLE "LOA" DROP COLUMN IF EXISTS "securityDepositDocumentUrl";

-- Step 3: Add new FDR reference columns to LOA
ALTER TABLE "LOA" ADD COLUMN IF NOT EXISTS "sdFdrId" TEXT;
ALTER TABLE "LOA" ADD COLUMN IF NOT EXISTS "pgFdrId" TEXT;

-- Step 4: Remove FDR columns that are no longer needed
ALTER TABLE "fdrs" DROP COLUMN IF EXISTS "tenderId";
ALTER TABLE "fdrs" DROP COLUMN IF EXISTS "loaId";
ALTER TABLE "fdrs" DROP COLUMN IF EXISTS "emdAmount";
ALTER TABLE "fdrs" DROP COLUMN IF EXISTS "sdAmount";

-- Step 5: Update FDRCategory enum to include SD and PG
-- Note: We keep FD and BG for backward compatibility with existing records
ALTER TYPE "FDRCategory" ADD VALUE IF NOT EXISTS 'SD';
ALTER TYPE "FDRCategory" ADD VALUE IF NOT EXISTS 'PG';

-- Step 6: Make category NOT NULL (set default first if needed)
UPDATE "fdrs" SET "category" = 'FD' WHERE "category" IS NULL;
ALTER TABLE "fdrs" ALTER COLUMN "category" SET NOT NULL;

-- Step 7: Remove Tender.fdrs relation from Tender model
-- (No SQL needed, this is just removing the relation definition)

-- Step 8: Create unique constraints for sdFdrId and pgFdrId
CREATE UNIQUE INDEX IF NOT EXISTS "LOA_sdFdrId_key" ON "LOA"("sdFdrId");
CREATE UNIQUE INDEX IF NOT EXISTS "LOA_pgFdrId_key" ON "LOA"("pgFdrId");

-- Step 9: Create indexes for the new FDR reference columns
CREATE INDEX IF NOT EXISTS "LOA_sdFdrId_idx" ON "LOA"("sdFdrId");
CREATE INDEX IF NOT EXISTS "LOA_pgFdrId_idx" ON "LOA"("pgFdrId");

-- Step 10: Add foreign key constraints for the new FDR references
ALTER TABLE "LOA" ADD CONSTRAINT "LOA_sdFdrId_fkey" FOREIGN KEY ("sdFdrId") REFERENCES "fdrs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LOA" ADD CONSTRAINT "LOA_pgFdrId_fkey" FOREIGN KEY ("pgFdrId") REFERENCES "fdrs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
