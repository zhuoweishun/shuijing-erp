/*
  Warnings:

  - You are about to alter the column `status` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(1))` to `Enum(EnumId(5))`.
  - You are about to alter the column `status` on the `purchases` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(5))` to `Enum(EnumId(4))`.

*/
-- AlterTable
ALTER TABLE `products` ADD COLUMN `skuId` VARCHAR(191) NULL,
    MODIFY `status` ENUM('MAKING', 'AVAILABLE', 'SOLD', 'OFFLINE') NOT NULL DEFAULT 'AVAILABLE';

-- AlterTable
ALTER TABLE `purchases` MODIFY `status` ENUM('ACTIVE', 'USED') NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE `product_skus` (
    `id` VARCHAR(191) NOT NULL,
    `skuCode` VARCHAR(191) NOT NULL,
    `skuName` VARCHAR(191) NOT NULL,
    `materialSignatureHash` VARCHAR(191) NOT NULL,
    `materialSignature` JSON NOT NULL,
    `total_quantity` INTEGER NOT NULL DEFAULT 0,
    `availableQuantity` INTEGER NOT NULL DEFAULT 0,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `totalValue` DECIMAL(10, 2) NOT NULL,
    `photos` JSON NULL,
    `description` TEXT NULL,
    `specification` VARCHAR(191) NULL,
    `materialCost` DECIMAL(10, 2) NULL,
    `laborCost` DECIMAL(10, 2) NULL,
    `craftCost` DECIMAL(10, 2) NULL,
    `totalCost` DECIMAL(10, 2) NULL,
    `sellingPrice` DECIMAL(10, 2) NOT NULL,
    `profitMargin` DECIMAL(5, 2) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `product_skus_skuCode_key`(`skuCode`),
    INDEX `product_skus_materialSignatureHash_idx`(`materialSignatureHash`),
    INDEX `product_skus_skuCode_idx`(`skuCode`),
    INDEX `product_skus_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sku_inventory_logs` (
    `id` VARCHAR(191) NOT NULL,
    `skuId` VARCHAR(191) NOT NULL,
    `action` ENUM('CREATE', 'SELL', 'ADJUST', 'DESTROY') NOT NULL,
    `quantityChange` INTEGER NOT NULL,
    `quantityBefore` INTEGER NOT NULL,
    `quantityAfter` INTEGER NOT NULL,
    `referenceType` ENUM('PRODUCT', 'SALE', 'MANUAL', 'DESTROY', 'REFUND') NOT NULL,
    `referenceId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NOT NULL,

    INDEX `sku_inventory_logs_skuId_idx`(`skuId`),
    INDEX `sku_inventory_logs_action_idx`(`action`),
    INDEX `sku_inventory_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `address` TEXT NULL,
    `notes` TEXT NULL,
    `totalPurchases` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `totalOrders` INTEGER NOT NULL DEFAULT 0,
    `firstPurchaseDate` DATETIME(3) NULL,
    `lastPurchaseDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customers_phone_key`(`phone`),
    INDEX `customers_phone_idx`(`phone`),
    INDEX `customers_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_notes` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `category` ENUM('PREFERENCE', 'BEHAVIOR', 'CONTACT', 'OTHER') NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,

    INDEX `customer_notes_customerId_idx`(`customerId`),
    INDEX `customer_notes_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_purchases` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `skuId` VARCHAR(191) NOT NULL,
    `skuName` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `originalPrice` DECIMAL(10, 2) NULL,
    `total_price` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('ACTIVE', 'REFUNDED') NOT NULL DEFAULT 'ACTIVE',
    `refundDate` DATETIME(3) NULL,
    `refundReason` VARCHAR(191) NULL,
    `refundNotes` TEXT NULL,
    `saleChannel` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `purchaseDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `customer_purchases_customerId_idx`(`customerId`),
    INDEX `customer_purchases_skuId_idx`(`skuId`),
    INDEX `customer_purchases_purchaseDate_idx`(`purchaseDate`),
    INDEX `customer_purchases_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial_records` (
    `id` VARCHAR(191) NOT NULL,
    `recordType` ENUM('INCOME', 'EXPENSE', 'REFUND', 'LOSS') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `referenceType` ENUM('PURCHASE', 'SALE', 'REFUND', 'MANUAL') NOT NULL,
    `referenceId` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `transactionDate` DATETIME(3) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `financial_records_recordType_idx`(`recordType`),
    INDEX `financial_records_referenceType_referenceId_idx`(`referenceType`, `referenceId`),
    INDEX `financial_records_transactionDate_idx`(`transactionDate`),
    INDEX `financial_records_userId_idx`(`userId`),
    INDEX `financial_records_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_skuId_fkey` FOREIGN KEY (`skuId`) REFERENCES `product_skus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_skus` ADD CONSTRAINT `product_skus_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku_inventory_logs` ADD CONSTRAINT `sku_inventory_logs_skuId_fkey` FOREIGN KEY (`skuId`) REFERENCES `product_skus`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku_inventory_logs` ADD CONSTRAINT `sku_inventory_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_notes` ADD CONSTRAINT `customer_notes_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_notes` ADD CONSTRAINT `customer_notes_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_purchases` ADD CONSTRAINT `customer_purchases_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_purchases` ADD CONSTRAINT `customer_purchases_skuId_fkey` FOREIGN KEY (`skuId`) REFERENCES `product_skus`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_records` ADD CONSTRAINT `financial_records_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
