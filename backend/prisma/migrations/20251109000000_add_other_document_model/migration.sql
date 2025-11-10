-- CreateTable
CREATE TABLE "OtherDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "loaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OtherDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OtherDocument_loaId_idx" ON "OtherDocument"("loaId");

-- AddForeignKey
ALTER TABLE "OtherDocument" ADD CONSTRAINT "OtherDocument_loaId_fkey" FOREIGN KEY ("loaId") REFERENCES "LOA"("id") ON DELETE CASCADE ON UPDATE CASCADE;
