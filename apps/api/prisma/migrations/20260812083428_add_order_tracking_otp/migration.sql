-- CreateTable
CREATE TABLE "OrderTrackingOtp" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderTrackingOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderTrackingOtp_orderId_createdAt_idx" ON "OrderTrackingOtp"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrderTrackingOtp" ADD CONSTRAINT "OrderTrackingOtp_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
