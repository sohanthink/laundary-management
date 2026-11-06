-- Hotel's own items now use our product types (or a free name) instead of a separate item list.
-- Existing rows keep their item name.

-- AlterTable: add the new columns as nullable first
ALTER TABLE "HotelItemMovement" ADD COLUMN "itemName" TEXT,
ADD COLUMN "productId" TEXT;

-- Copy the old item names across
UPDATE "HotelItemMovement" AS m
SET "itemName" = s."name"
FROM "ServiceItem" AS s
WHERE s."id" = m."serviceItemId";

UPDATE "HotelItemMovement" SET "itemName" = 'Item' WHERE "itemName" IS NULL;

ALTER TABLE "HotelItemMovement" ALTER COLUMN "itemName" SET NOT NULL;

-- Link to a product when an item has the same name as one of our products
UPDATE "HotelItemMovement" AS m
SET "productId" = p."id"
FROM "Product" AS p
WHERE lower(p."name") = lower(m."itemName")
  AND m."productId" IS NULL;

-- DropForeignKey
ALTER TABLE "HotelServicePrice" DROP CONSTRAINT "HotelServicePrice_hotelId_fkey";
ALTER TABLE "HotelServicePrice" DROP CONSTRAINT "HotelServicePrice_serviceItemId_fkey";
ALTER TABLE "HotelItemMovement" DROP CONSTRAINT "HotelItemMovement_serviceItemId_fkey";

-- DropIndex
DROP INDEX "HotelItemMovement_hotelId_serviceItemId_idx";

-- AlterTable
ALTER TABLE "HotelItemMovement" DROP COLUMN "serviceItemId";

-- DropTable
DROP TABLE "ServiceItem";
DROP TABLE "HotelServicePrice";

-- CreateIndex
CREATE INDEX "HotelItemMovement_hotelId_productId_idx" ON "HotelItemMovement"("hotelId", "productId");
CREATE INDEX "HotelItemMovement_hotelId_itemName_idx" ON "HotelItemMovement"("hotelId", "itemName");

-- AddForeignKey
ALTER TABLE "HotelItemMovement" ADD CONSTRAINT "HotelItemMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
