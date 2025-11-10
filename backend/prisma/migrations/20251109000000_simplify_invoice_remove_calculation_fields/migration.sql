-- AlterTable
-- Remove calculation fields from Invoice table
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "totalReceivables",
DROP COLUMN IF EXISTS "actualAmountReceived",
DROP COLUMN IF EXISTS "amountDeducted",
DROP COLUMN IF EXISTS "amountPending",
DROP COLUMN IF EXISTS "deductionReason";
