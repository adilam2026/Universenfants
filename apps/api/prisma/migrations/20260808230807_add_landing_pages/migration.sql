-- CreateEnum
CREATE TYPE "LandingPageStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "landingPageId" TEXT;

-- CreateTable
CREATE TABLE "LandingPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "LandingPageStatus" NOT NULL DEFAULT 'DRAFT',
    "productId" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "blocks" JSONB NOT NULL,
    "displayPrice" DECIMAL(10,2),
    "compareAtPrice" DECIMAL(10,2),
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "ctaColor" TEXT,
    "ctaLabel" TEXT,
    "countdownEnabled" BOOLEAN NOT NULL DEFAULT false,
    "countdownStartAt" TIMESTAMP(3),
    "countdownEndAt" TIMESTAMP(3),
    "requireAddress" BOOLEAN NOT NULL DEFAULT false,
    "successPhone" TEXT,
    "successWhatsapp" TEXT,
    "successHours" TEXT,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_slug_key" ON "LandingPage"("slug");

-- CreateIndex
CREATE INDEX "LandingPage_status_idx" ON "LandingPage"("status");

-- CreateIndex
CREATE INDEX "LandingPage_productId_idx" ON "LandingPage"("productId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

