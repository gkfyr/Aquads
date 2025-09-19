-- CreateTable
CREATE TABLE "Slot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publisher" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "domain_hash" TEXT NOT NULL,
    "reserve_price" BIGINT NOT NULL,
    "current_renter" TEXT,
    "rental_expiry" BIGINT NOT NULL,
    "last_price" BIGINT NOT NULL,
    "latest_meta_cid" TEXT,
    "created_at" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slot_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "ts" BIGINT NOT NULL
);
