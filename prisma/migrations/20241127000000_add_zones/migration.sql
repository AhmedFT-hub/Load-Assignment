-- CreateEnum
CREATE TYPE "ZoneCategory" AS ENUM ('THEFT', 'PILFERAGE', 'STOPPAGE', 'HIGH_RISK', 'ACCIDENT_PRONE', 'TRAFFIC_CONGESTION', 'CUSTOM');

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ZoneCategory" NOT NULL,
    "coordinates" JSONB NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Zone_category_idx" ON "Zone"("category");

-- CreateIndex
CREATE INDEX "Zone_name_idx" ON "Zone"("name");


