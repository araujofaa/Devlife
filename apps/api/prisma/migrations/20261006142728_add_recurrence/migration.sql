-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "recurrence_end_date" TIMESTAMP(3),
ADD COLUMN     "recurrence_interval" INTEGER DEFAULT 1,
ADD COLUMN     "recurrence_parent_id" TEXT,
ADD COLUMN     "recurrence_type" TEXT;
