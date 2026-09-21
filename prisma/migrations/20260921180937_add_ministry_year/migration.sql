-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "titleKo" TEXT NOT NULL,
    "titleEn" TEXT,
    "worshipType" TEXT NOT NULL,
    "tempo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinistryYear" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "entranceSongId" TEXT,
    "confessionSongId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinistryYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setlist" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "title" TEXT,
    "rawText" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Setlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetlistSong" (
    "id" TEXT NOT NULL,
    "setlistId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "SetlistSong_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Song_worshipType_tempo_idx" ON "Song"("worshipType", "tempo");

-- CreateIndex
CREATE UNIQUE INDEX "Song_titleKo_key" ON "Song"("titleKo");

-- CreateIndex
CREATE UNIQUE INDEX "MinistryYear_label_key" ON "MinistryYear"("label");

-- CreateIndex
CREATE INDEX "Setlist_date_idx" ON "Setlist"("date");

-- CreateIndex
CREATE INDEX "SetlistSong_songId_idx" ON "SetlistSong"("songId");

-- CreateIndex
CREATE UNIQUE INDEX "SetlistSong_setlistId_songId_key" ON "SetlistSong"("setlistId", "songId");

-- AddForeignKey
ALTER TABLE "MinistryYear" ADD CONSTRAINT "MinistryYear_entranceSongId_fkey" FOREIGN KEY ("entranceSongId") REFERENCES "Song"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinistryYear" ADD CONSTRAINT "MinistryYear_confessionSongId_fkey" FOREIGN KEY ("confessionSongId") REFERENCES "Song"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetlistSong" ADD CONSTRAINT "SetlistSong_setlistId_fkey" FOREIGN KEY ("setlistId") REFERENCES "Setlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetlistSong" ADD CONSTRAINT "SetlistSong_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
