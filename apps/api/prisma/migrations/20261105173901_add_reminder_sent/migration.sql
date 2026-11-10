-- AlterTable
ALTER TABLE "subtasks" ADD COLUMN     "reminder_sent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "reminder_sent" BOOLEAN NOT NULL DEFAULT false;
