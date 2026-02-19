-- DropIndex
DROP INDEX IF EXISTS "Plan_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_durationDays_key" ON "Plan"("name", "durationDays");
