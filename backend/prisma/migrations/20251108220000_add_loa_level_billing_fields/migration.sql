-- AlterTable
ALTER TABLE "LOA" ADD COLUMN "actualAmountReceived" DOUBLE PRECISION,
ADD COLUMN "amountDeducted" DOUBLE PRECISION,
ADD COLUMN "amountPending" DOUBLE PRECISION,
ADD COLUMN "deductionReason" TEXT;
