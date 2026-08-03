-- Add Steam OpenID login fields to User
-- AlterTable
ALTER TABLE "User" ADD COLUMN "steamId" TEXT,
ADD COLUMN "steamName" TEXT,
ADD COLUMN "steamAvatarUrl" TEXT,
ADD COLUMN "steamProfileUrl" TEXT,
ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_steamId_key" ON "User"("steamId");
