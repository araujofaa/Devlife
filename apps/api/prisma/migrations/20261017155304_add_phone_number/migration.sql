-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone_number" TEXT,
ADD COLUMN     "phone_verified" BOOLEAN NOT NULL DEFAULT false;
