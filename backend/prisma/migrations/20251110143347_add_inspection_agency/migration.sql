-- CreateTable
CREATE TABLE "inspection_agencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_agencies_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "loas" ADD COLUMN     "inspectionAgencyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "inspection_agencies_name_key" ON "inspection_agencies"("name");

-- CreateIndex
CREATE INDEX "loas_inspectionAgencyId_idx" ON "loas"("inspectionAgencyId");

-- AddForeignKey
ALTER TABLE "loas" ADD CONSTRAINT "loas_inspectionAgencyId_fkey" FOREIGN KEY ("inspectionAgencyId") REFERENCES "inspection_agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
