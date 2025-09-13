/*
  Warnings:

  - You are about to drop the column `quantityUsedBeads` on the `material_usage` table. All the data in the column will be lost.
  - You are about to drop the column `quantityUsedPieces` on the `material_usage` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `suppliers` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `suppliers` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `suppliers` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastLoginAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - Added the required column `materialId` to the `material_usage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantityUsed` to the `material_usage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `suppliers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `customers` ADD COLUMN `averageOrderValue` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `city` VARCHAR(191) NULL,
    ADD COLUMN `customerLabels` JSON NULL,
    ADD COLUMN `daysSinceFirstPurchase` INTEGER NULL,
    ADD COLUMN `daysSinceLastPurchase` INTEGER NULL,
    ADD COLUMN `primaryLabel` VARCHAR(191) NULL,
    ADD COLUMN `province` VARCHAR(191) NULL,
    ADD COLUMN `refundCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `refundRate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
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
ALTER TABLE `suppliers` DROP COLUMN `createdAt`,
    DROP COLUMN `isActive`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `createdAt`,
    DROP COLUMN `isActive`,
    DROP COLUMN `lastLoginAt`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `last_login_at` DATETIME(3) NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;
