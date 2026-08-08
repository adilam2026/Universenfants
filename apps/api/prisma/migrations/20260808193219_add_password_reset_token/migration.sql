-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "passwordResetExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_passwordResetToken_key" ON "Customer"("passwordResetToken");

