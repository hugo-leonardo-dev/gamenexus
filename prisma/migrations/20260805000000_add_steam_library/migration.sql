-- Add Steam library sync (owned games) support
-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastLibrarySyncAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SteamOwnedGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "steamAppId" TEXT NOT NULL,
    "playtimeForever" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SteamOwnedGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SteamOwnedGame_userId_idx" ON "SteamOwnedGame"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SteamOwnedGame_userId_steamAppId_key" ON "SteamOwnedGame"("userId", "steamAppId");

-- AddForeignKey
ALTER TABLE "SteamOwnedGame" ADD CONSTRAINT "SteamOwnedGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
