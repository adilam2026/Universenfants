-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "emailChangeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "emailChangeToken" TEXT,
ADD COLUMN     "pendingEmail" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_emailChangeToken_key" ON "Customer"("emailChangeToken");

