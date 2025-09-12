/*
  Warnings:

  - You are about to drop the column `quantityUsedBeads` on the `material_usage` table. All the data in the column will be lost.
  - You are about to drop the column `quantityUsedPieces` on the `material_usage` table. All the data in the column will be lost.
  - You are about to drop the column `product_type` on the `purchases` table. All the data in the column will be lost.
  - Added the required column `materialId` to the `material_usage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantityUsed` to the `material_usage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `customers` ADD COLUMN `averageOrderValue` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `city` VARCHAR(191) NULL,
    ADD COLUMN `customerLabels` JSON NULL,
    ADD COLUMN `daysSinceFirstPurchase` INTEGER NULL,
    ADD COLUMN `daysSinceLastPurchase` INTEGER NULL,
    ADD COLUMN `primaryLabel` VARCHAR(191) NULL,
    ADD COLUMN `province` VARCHAR(191) NULL,
    ADD COLUMN `refundCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `refundRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `totalAllOrders` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `material_usage` DROP COLUMN `quantityUsedBeads`,
    DROP COLUMN `quantityUsedPieces`,
    ADD COLUMN `action` ENUM('CREATE', 'USE', 'RETURN', 'ADJUST') NOT NULL DEFAULT 'CREATE',
    ADD COLUMN `materialId` VARCHAR(191) NOT NULL,
    ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `quantityUsed` INTEGER NOT NULL,
    ADD COLUMN `skuId` VARCHAR(191) NULL,
    MODIFY `purchaseId` VARCHAR(191) NULL,
    MODIFY `productId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `purchases` DROP COLUMN `product_type`,
    ADD COLUMN `material_type` ENUM('LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED') NOT NULL DEFAULT 'BRACELET';

-- CreateTable
CREATE TABLE `materials` (
    `id` VARCHAR(191) NOT NULL,
    `materialCode` VARCHAR(191) NOT NULL,
    `material_name` VARCHAR(191) NOT NULL,
    `material_type` ENUM('SEMI_FINISHED', 'FINISHED') NOT NULL,
    `specification` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NOT NULL,
    `total_quantity` INTEGER NOT NULL DEFAULT 0,
    `availableQuantity` INTEGER NOT NULL DEFAULT 0,
    `usedQuantity` INTEGER NOT NULL DEFAULT 0,
    `unitCost` DECIMAL(10, 4) NOT NULL,
    `totalCost` DECIMAL(10, 2) NOT NULL,
    `quality` ENUM('AA', 'A', 'AB', 'B', 'C') NULL,
    `photos` JSON NULL,
    `notes` TEXT NULL,
    `status` ENUM('ACTIVE', 'DEPLETED', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `purchaseId` VARCHAR(191) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `materials_materialCode_key`(`materialCode`),
    INDEX `materials_materialCode_idx`(`materialCode`),
    INDEX `materials_materialType_idx`(`material_type`),
    INDEX `materials_status_idx`(`status`),
    INDEX `materials_purchaseId_idx`(`purchaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `customers_totalAllOrders_idx` ON `customers`(`totalAllOrders`);

-- CreateIndex
CREATE INDEX `customers_refundCount_idx` ON `customers`(`refundCount`);

-- CreateIndex
CREATE INDEX `customers_refundRate_idx` ON `customers`(`refundRate`);

-- CreateIndex
CREATE INDEX `customers_averageOrderValue_idx` ON `customers`(`averageOrderValue`);

-- CreateIndex
CREATE INDEX `customers_daysSinceLastPurchase_idx` ON `customers`(`daysSinceLastPurchase`);

-- CreateIndex
CREATE INDEX `customers_primaryLabel_idx` ON `customers`(`primaryLabel`);

-- CreateIndex
CREATE INDEX `customers_city_idx` ON `customers`(`city`);

-- CreateIndex
CREATE INDEX `customers_province_idx` ON `customers`(`province`);

-- CreateIndex
CREATE INDEX `material_usage_materialId_idx` ON `material_usage`(`materialId`);

-- CreateIndex
CREATE INDEX `material_usage_skuId_idx` ON `material_usage`(`skuId`);

-- CreateIndex
CREATE INDEX `material_usage_action_idx` ON `material_usage`(`action`);

-- AddForeignKey
ALTER TABLE `materials` ADD CONSTRAINT `materials_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materials` ADD CONSTRAINT `materials_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_usage` ADD CONSTRAINT `material_usage_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_usage` ADD CONSTRAINT `material_usage_skuId_fkey` FOREIGN KEY (`skuId`) REFERENCES `product_skus`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
