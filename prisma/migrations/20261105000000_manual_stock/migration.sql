-- CreateEnum
CREATE TYPE "HotelItemMovementType" AS ENUM ('COLLECTED', 'DELIVERED');

-- AlterEnum
ALTER TYPE "MovementType" ADD VALUE 'REJECT';

-- DropForeignKey
ALTER TABLE "ServiceOrder" DROP CONSTRAINT "ServiceOrder_hotelId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceOrderLine" DROP CONSTRAINT "ServiceOrderLine_serviceOrderId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceOrderLine" DROP CONSTRAINT "ServiceOrderLine_serviceItemId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerEntry" DROP CONSTRAINT "LedgerEntry_serviceOrderId_fkey";

-- AlterTable
ALTER TABLE "LedgerEntry" DROP COLUMN "serviceOrderId",
ADD COLUMN     "batchId" TEXT;

-- DropTable
DROP TABLE "ServiceOrder";

-- DropTable
DROP TABLE "ServiceOrderLine";

-- DropEnum
DROP TYPE "ServiceStatus";

-- CreateTable
CREATE TABLE "HotelItemMovement" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "serviceItemId" TEXT NOT NULL,
    "type" "HotelItemMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceSnapshot" INTEGER NOT NULL DEFAULT 0,
    "lineTotal" INTEGER NOT NULL DEFAULT 0,
    "sendId" TEXT,
    "batchId" TEXT NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HotelItemMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HotelItemMovement_hotelId_serviceItemId_idx" ON "HotelItemMovement"("hotelId", "serviceItemId");

-- CreateIndex
CREATE INDEX "HotelItemMovement_batchId_idx" ON "HotelItemMovement"("batchId");

-- AddForeignKey
ALTER TABLE "HotelItemMovement" ADD CONSTRAINT "HotelItemMovement_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelItemMovement" ADD CONSTRAINT "HotelItemMovement_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelItemMovement" ADD CONSTRAINT "HotelItemMovement_sendId_fkey" FOREIGN KEY ("sendId") REFERENCES "Send"("id") ON DELETE SET NULL ON UPDATE CASCADE;

