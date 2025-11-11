-- Rename EMD return fields to EMD release fields
ALTER TABLE "Tender" RENAME COLUMN "emdReturnStatus" TO "emdReleaseStatus";
ALTER TABLE "Tender" RENAME COLUMN "emdReturnDate" TO "emdReleaseDate";
ALTER TABLE "Tender" RENAME COLUMN "emdReturnAmount" TO "emdReleaseAmount";
