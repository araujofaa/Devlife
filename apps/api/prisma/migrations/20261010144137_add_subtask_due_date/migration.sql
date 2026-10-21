-- AlterTable
ALTER TABLE "subtasks" ADD COLUMN     "due_date" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "subtasks_due_date_idx" ON "subtasks"("due_date");
