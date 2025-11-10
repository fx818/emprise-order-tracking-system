-- CreateTable
CREATE TABLE "pocs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pocs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pocs_name_key" ON "pocs"("name");

-- AlterTable
ALTER TABLE "LOA" ADD COLUMN "pocId" TEXT;

-- Migrate existing orderPOC data to pocs table
-- Insert unique POC names from existing LOA records
INSERT INTO "pocs" ("id", "name", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    unique_poc,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT "orderPOC" as unique_poc
    FROM "LOA"
    WHERE "orderPOC" IS NOT NULL AND "orderPOC" != ''
) AS unique_pocs;

-- Update LOA records to reference the corresponding POC
UPDATE "LOA"
SET "pocId" = "pocs"."id"
FROM "pocs"
WHERE "LOA"."orderPOC" = "pocs"."name"
  AND "LOA"."orderPOC" IS NOT NULL
  AND "LOA"."orderPOC" != '';

-- CreateForeignKey
ALTER TABLE "LOA" ADD CONSTRAINT "LOA_pocId_fkey" FOREIGN KEY ("pocId") REFERENCES "pocs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "LOA_pocId_idx" ON "LOA"("pocId");
