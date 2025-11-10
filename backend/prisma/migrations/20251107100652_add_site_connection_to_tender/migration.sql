-- AlterTable: Add siteId column to Tender table
ALTER TABLE "Tender" ADD COLUMN "siteId" TEXT;

-- CreateIndex
CREATE INDEX "Tender_siteId_idx" ON "Tender"("siteId");

-- AddForeignKey
ALTER TABLE "Tender" ADD CONSTRAINT "Tender_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
