-- Add steamLinkedAt to User (when the user linked their Steam account)
-- AlterTable
ALTER TABLE "User" ADD COLUMN "steamLinkedAt" TIMESTAMP(3);
