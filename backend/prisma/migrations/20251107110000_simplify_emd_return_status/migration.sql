-- Check if EMDReturnStatus enum exists, if not, create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EMDReturnStatus') THEN
        CREATE TYPE "EMDReturnStatus" AS ENUM ('PENDING', 'RELEASED', 'RETAINED_AS_SD');
    ELSE
        -- Create new enum with simplified values
        CREATE TYPE "EMDReturnStatus_new" AS ENUM ('PENDING', 'RELEASED', 'RETAINED_AS_SD');

        -- Update existing data only if column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'Tender' AND column_name = 'emdReturnStatus'
        ) THEN
            ALTER TABLE "Tender"
              ALTER COLUMN "emdReturnStatus" TYPE "EMDReturnStatus_new"
              USING (
                CASE
                  WHEN "emdReturnStatus"::text = 'RETURNED' THEN 'RELEASED'::EMDReturnStatus_new
                  WHEN "emdReturnStatus"::text = 'NOT_RETURNED' THEN 'PENDING'::EMDReturnStatus_new
                  ELSE "emdReturnStatus"::text::EMDReturnStatus_new
                END
              );
        END IF;

        -- Drop old enum
        DROP TYPE "EMDReturnStatus";

        -- Rename new enum to original name
        ALTER TYPE "EMDReturnStatus_new" RENAME TO "EMDReturnStatus";
    END IF;
END$$;
