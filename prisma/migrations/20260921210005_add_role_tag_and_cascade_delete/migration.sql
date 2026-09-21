/*
  Warnings:

  - You are about to drop the column `worshipType` on the `Song` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "SetlistSong" DROP CONSTRAINT "SetlistSong_songId_fkey";

-- DropIndex
DROP INDEX "Song_worshipType_tempo_idx";

-- AlterTable
ALTER TABLE "Song" DROP COLUMN "worshipType",
ADD COLUMN     "mood" TEXT,
ADD COLUMN     "roleTag" TEXT;

-- CreateIndex
CREATE INDEX "Song_tempo_idx" ON "Song"("tempo");

-- AddForeignKey
ALTER TABLE "SetlistSong" ADD CONSTRAINT "SetlistSong_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
