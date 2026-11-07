-- CreateEnum
CREATE TYPE "CounterService" AS ENUM ('WASH_IRON', 'IRON_ONLY');

-- CreateTable
CREATE TABLE "CounterItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "washIronPrice" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CounterItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalkInCustomer" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalkInCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CounterSale" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "customerId" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "note" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "voidReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CounterSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CounterSaleLine" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "counterItemId" TEXT,
    "itemName" TEXT NOT NULL,
    "service" "CounterService" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "lineTotal" INTEGER NOT NULL,

    CONSTRAINT "CounterSaleLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CounterPayment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "saleId" TEXT,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "voidReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CounterPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CounterItem_name_key" ON "CounterItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WalkInCustomer_phone_key" ON "WalkInCustomer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "CounterSale_number_key" ON "CounterSale"("number");

-- CreateIndex
CREATE INDEX "CounterSale_customerId_createdAt_idx" ON "CounterSale"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "CounterSale_createdAt_idx" ON "CounterSale"("createdAt");

-- CreateIndex
CREATE INDEX "CounterPayment_customerId_date_idx" ON "CounterPayment"("customerId", "date");

-- CreateIndex
CREATE INDEX "CounterPayment_date_idx" ON "CounterPayment"("date");

-- AddForeignKey
ALTER TABLE "CounterSale" ADD CONSTRAINT "CounterSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "WalkInCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounterSaleLine" ADD CONSTRAINT "CounterSaleLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "CounterSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounterSaleLine" ADD CONSTRAINT "CounterSaleLine_counterItemId_fkey" FOREIGN KEY ("counterItemId") REFERENCES "CounterItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounterPayment" ADD CONSTRAINT "CounterPayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "WalkInCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounterPayment" ADD CONSTRAINT "CounterPayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "CounterSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

