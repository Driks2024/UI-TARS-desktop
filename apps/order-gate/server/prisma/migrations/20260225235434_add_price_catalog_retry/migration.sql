-- CreateTable
CREATE TABLE "PriceCatalog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT,
    "prefix" TEXT,
    "groupName" TEXT,
    "fullPrice" REAL,
    "minPrice" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
