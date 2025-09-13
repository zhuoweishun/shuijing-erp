/*
  Warnings:

  - You are about to drop the column `createdAt` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `resourceId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `customer_notes` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `customer_notes` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `customer_notes` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `customer_notes` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `customer_purchases` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `customer_purchases` table. All the data in the column will be lost.
  - You are about to drop the column `originalPrice` on the `customer_purchases` table. All the data in the column will be lost.
  - You are about to drop the column `purchaseDate` on the `customer_purchases` table. All the data in the column will be lost.
  - You are about to drop the column `refundDate` on the `customer_purchases` table. All the data in the column will be lost.
  - You are about to drop the column `refundNotes` on the `customer_purchases` table. All the data in the column will be lost.
  - You are about to drop the column `refundReason` on the `customer_purchases` table. All the data in the column will be lost.
  - You are about to drop the column `saleChannel` on the `customer_purchases` table. All the data in the column will be lost.
  - You are about to drop the column `skuId` on the `customer_purchases` table. All the data in the column will be lost.
  - You are about to drop the column `skuName` on the `customer_purchases` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `customer_purchases` table. All the data in the column will be lost.
  - You are about to drop the column `averageOrderValue` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `customerLabels` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `daysSinceFirstPurchase` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `daysSinceLastPurchase` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `firstPurchaseDate` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `lastPurchaseDate` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `primaryLabel` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `refundCount` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `refundRate` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `totalAllOrders` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `totalOrders` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `totalPurchases` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `changedFields` on the `edit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `edit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `purchaseId` on the `edit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `edit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `financial_records` table. All the data in the column will be lost.
  - You are about to drop the column `recordType` on the `financial_records` table. All the data in the column will be lost.
  - You are about to drop the column `referenceId` on the `financial_records` table. All the data in the column will be lost.
  - You are about to drop the column `referenceType` on the `financial_records` table. All the data in the column will be lost.
  - You are about to drop the column `transactionDate` on the `financial_records` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `financial_records` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `financial_records` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `material_usage` table. All the data in the column will be lost.
  - You are about to drop the column `materialId` on the `material_usage` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `material_usage` table. All the data in the column will be lost.
  - You are about to drop the column `purchaseId` on the `material_usage` table. All the data in the column will be lost.
  - You are about to drop the column `quantityUsed` on the `material_usage` table. All the data in the column will be lost.
  - You are about to drop the column `skuId` on the `material_usage` table. All the data in the column will be lost.
  - You are about to drop the column `totalCost` on the `material_usage` table. All the data in the column will be lost.
  - You are about to drop the column `unitCost` on the `material_usage` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `material_usage` table. All the data in the column will be lost.
  - You are about to drop the column `availableQuantity` on the `product_skus` table. All the data in the column will be lost.
  - You are about to drop the column `craftCost` on the `product_skus` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `product_skus` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `product_skus` table. All the data in the column will be lost.
  - You are about to drop the column `laborCost` on the `product_skus` table. All the data in the column will be lost.
  - You are about to drop the column `materialCost` on the `product_skus` table. All the data in the column will be lost.
  - You are about to drop the column `materialSignature` on the `product_skus` table. All the data in the column will be lost.
  - You are about to drop the column `materialSignatureHash` on the `product_skus` table. All the data in the column will be lost.
  - You are about to drop the column `profitMargin` on the `product_skus` table. All the data in the column will be lost.
  - You are about to drop the column `sellingPrice` on the `product_skus` table. All the data in the column will be lost.
  - You are about to drop the column `skuCode` on the `product_skus` table. All the data in the column will be lost.
  - You are about to drop the column `skuName` on the `product_skus` table. All the data in the column will be lost.
  - You are about to drop the column `totalCost` on the `product_skus` table. All the data in the column will be lost.
  - You are about to drop the column `totalValue` on the `product_skus` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `product_skus` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `productCode` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `skuId` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `totalValue` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `unitPrice` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `aiRecognitionResult` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `beadDiameter` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `beadsPerString` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `lastEditedById` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `minStockAlert` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `naturalLanguageInput` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `pieceCount` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerBead` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerGram` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerPiece` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `productName` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `productType` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `purchaseCode` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `purchaseDate` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `supplierId` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `totalBeads` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `totalPrice` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `unitPrice` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `unitType` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `sku_inventory_logs` table. All the data in the column will be lost.
  - You are about to drop the column `quantityAfter` on the `sku_inventory_logs` table. All the data in the column will be lost.
  - You are about to drop the column `quantityBefore` on the `sku_inventory_logs` table. All the data in the column will be lost.
  - You are about to drop the column `quantityChange` on the `sku_inventory_logs` table. All the data in the column will be lost.
  - You are about to drop the column `referenceId` on the `sku_inventory_logs` table. All the data in the column will be lost.
  - You are about to drop the column `referenceType` on the `sku_inventory_logs` table. All the data in the column will be lost.
  - You are about to drop the column `skuId` on the `sku_inventory_logs` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `sku_inventory_logs` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `system_configs` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `system_configs` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sku_code]` on the table `product_skus` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[purchase_code]` on the table `purchases` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `created_by` to the `customer_notes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customer_id` to the `customer_notes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `customer_notes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customer_id` to the `customer_purchases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sku_id` to the `customer_purchases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sku_name` to the `customer_purchases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `customer_purchases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purchase_id` to the `edit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `edit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `record_type` to the `financial_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reference_type` to the `financial_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transaction_date` to the `financial_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `financial_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `financial_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `material_id` to the `material_usage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity_used` to the `material_usage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `material_usage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `product_skus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `material_signature` to the `product_skus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `material_signature_hash` to the `product_skus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `selling_price` to the `product_skus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sku_code` to the `product_skus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sku_name` to the `product_skus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_value` to the `product_skus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `product_skus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_value` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit_price` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_name` to the `purchases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purchase_code` to the `purchases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purchase_date` to the `purchases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `purchases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `purchases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity_after` to the `sku_inventory_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity_before` to the `sku_inventory_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity_change` to the `sku_inventory_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reference_type` to the `sku_inventory_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sku_id` to the `sku_inventory_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `sku_inventory_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `system_configs` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `customer_notes` DROP FOREIGN KEY `customer_notes_createdBy_fkey`;

-- DropForeignKey
ALTER TABLE `customer_notes` DROP FOREIGN KEY `customer_notes_customerId_fkey`;

-- DropForeignKey
ALTER TABLE `customer_purchases` DROP FOREIGN KEY `customer_purchases_customerId_fkey`;

-- DropForeignKey
ALTER TABLE `customer_purchases` DROP FOREIGN KEY `customer_purchases_skuId_fkey`;

-- DropForeignKey
ALTER TABLE `edit_logs` DROP FOREIGN KEY `edit_logs_purchaseId_fkey`;

-- DropForeignKey
ALTER TABLE `edit_logs` DROP FOREIGN KEY `edit_logs_userId_fkey`;

-- DropForeignKey
ALTER TABLE `financial_records` DROP FOREIGN KEY `financial_records_userId_fkey`;

-- DropForeignKey
ALTER TABLE `material_usage` DROP FOREIGN KEY `material_usage_productId_fkey`;

-- DropForeignKey
ALTER TABLE `material_usage` DROP FOREIGN KEY `material_usage_purchaseId_fkey`;

-- DropForeignKey
ALTER TABLE `product_skus` DROP FOREIGN KEY `product_skus_createdBy_fkey`;

-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_skuId_fkey`;

-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_userId_fkey`;

-- DropForeignKey
ALTER TABLE `purchases` DROP FOREIGN KEY `purchases_lastEditedById_fkey`;

-- DropForeignKey
ALTER TABLE `purchases` DROP FOREIGN KEY `purchases_supplierId_fkey`;

-- DropForeignKey
ALTER TABLE `purchases` DROP FOREIGN KEY `purchases_userId_fkey`;

-- DropForeignKey
ALTER TABLE `sku_inventory_logs` DROP FOREIGN KEY `sku_inventory_logs_skuId_fkey`;

-- DropForeignKey
ALTER TABLE `sku_inventory_logs` DROP FOREIGN KEY `sku_inventory_logs_userId_fkey`;

-- DropIndex
DROP INDEX `customer_purchases_purchaseDate_idx` ON `customer_purchases`;

-- DropIndex
DROP INDEX `financial_records_createdAt_idx` ON `financial_records`;

-- DropIndex
DROP INDEX `financial_records_recordType_idx` ON `financial_records`;

-- DropIndex
DROP INDEX `financial_records_referenceType_referenceId_idx` ON `financial_records`;

-- DropIndex
DROP INDEX `financial_records_transactionDate_idx` ON `financial_records`;

-- DropIndex
DROP INDEX `product_skus_materialSignatureHash_idx` ON `product_skus`;

-- DropIndex
DROP INDEX `product_skus_skuCode_idx` ON `product_skus`;

-- DropIndex
DROP INDEX `product_skus_skuCode_key` ON `product_skus`;

-- DropIndex
DROP INDEX `purchases_purchaseCode_key` ON `purchases`;

-- DropIndex
DROP INDEX `sku_inventory_logs_createdAt_idx` ON `sku_inventory_logs`;

-- AlterTable
ALTER TABLE `audit_logs` DROP COLUMN `createdAt`,
    DROP COLUMN `ipAddress`,
    DROP COLUMN `resourceId`,
    DROP COLUMN `userAgent`,
    DROP COLUMN `userId`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `ip_address` VARCHAR(191) NULL,
    ADD COLUMN `resource_id` VARCHAR(191) NULL,
    ADD COLUMN `user_agent` VARCHAR(191) NULL,
    ADD COLUMN `user_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `customer_notes` DROP COLUMN `createdAt`,
    DROP COLUMN `createdBy`,
    DROP COLUMN `customerId`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `created_by` VARCHAR(191) NOT NULL,
    ADD COLUMN `customer_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `customer_purchases` DROP COLUMN `createdAt`,
    DROP COLUMN `customerId`,
    DROP COLUMN `originalPrice`,
    DROP COLUMN `purchaseDate`,
    DROP COLUMN `refundDate`,
    DROP COLUMN `refundNotes`,
    DROP COLUMN `refundReason`,
    DROP COLUMN `saleChannel`,
    DROP COLUMN `skuId`,
    DROP COLUMN `skuName`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `customer_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `original_price` DECIMAL(10, 2) NULL,
    ADD COLUMN `purchase_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `refund_date` DATETIME(3) NULL,
    ADD COLUMN `refund_notes` TEXT NULL,
    ADD COLUMN `refund_reason` VARCHAR(191) NULL,
    ADD COLUMN `sale_channel` VARCHAR(191) NULL,
    ADD COLUMN `sku_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `sku_name` VARCHAR(191) NOT NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `customers` DROP COLUMN `averageOrderValue`,
    DROP COLUMN `createdAt`,
    DROP COLUMN `customerLabels`,
    DROP COLUMN `daysSinceFirstPurchase`,
    DROP COLUMN `daysSinceLastPurchase`,
    DROP COLUMN `firstPurchaseDate`,
    DROP COLUMN `lastPurchaseDate`,
    DROP COLUMN `primaryLabel`,
    DROP COLUMN `refundCount`,
    DROP COLUMN `refundRate`,
    DROP COLUMN `totalAllOrders`,
    DROP COLUMN `totalOrders`,
    DROP COLUMN `totalPurchases`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `average_order_value` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `customer_labels` JSON NULL,
    ADD COLUMN `days_since_first_purchase` INTEGER NULL,
    ADD COLUMN `days_since_last_purchase` INTEGER NULL,
    ADD COLUMN `first_purchase_date` DATETIME(3) NULL,
    ADD COLUMN `last_purchase_date` DATETIME(3) NULL,
    ADD COLUMN `primary_label` VARCHAR(191) NULL,
    ADD COLUMN `refund_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `refund_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `total_all_orders` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `total_orders` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `total_purchases` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `edit_logs` DROP COLUMN `changedFields`,
    DROP COLUMN `createdAt`,
    DROP COLUMN `purchaseId`,
    DROP COLUMN `userId`,
    ADD COLUMN `changed_fields` JSON NULL,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `purchase_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `user_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `financial_records` DROP COLUMN `createdAt`,
    DROP COLUMN `recordType`,
    DROP COLUMN `referenceId`,
    DROP COLUMN `referenceType`,
    DROP COLUMN `transactionDate`,
    DROP COLUMN `updatedAt`,
    DROP COLUMN `userId`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `record_type` ENUM('INCOME', 'EXPENSE', 'REFUND', 'LOSS') NOT NULL,
    ADD COLUMN `reference_id` VARCHAR(191) NULL,
    ADD COLUMN `reference_type` ENUM('PURCHASE', 'SALE', 'REFUND', 'MANUAL') NOT NULL,
    ADD COLUMN `transaction_date` DATETIME(3) NOT NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL,
    ADD COLUMN `user_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `material_usage` DROP COLUMN `createdAt`,
    DROP COLUMN `materialId`,
    DROP COLUMN `productId`,
    DROP COLUMN `purchaseId`,
    DROP COLUMN `quantityUsed`,
    DROP COLUMN `skuId`,
    DROP COLUMN `totalCost`,
    DROP COLUMN `unitCost`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `material_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `product_id` VARCHAR(191) NULL,
    ADD COLUMN `purchase_id` VARCHAR(191) NULL,
    ADD COLUMN `quantity_used` INTEGER NOT NULL,
    ADD COLUMN `sku_id` VARCHAR(191) NULL,
    ADD COLUMN `total_cost` DECIMAL(10, 2) NULL,
    ADD COLUMN `unit_cost` DECIMAL(10, 4) NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `product_skus` DROP COLUMN `availableQuantity`,
    DROP COLUMN `craftCost`,
    DROP COLUMN `createdAt`,
    DROP COLUMN `createdBy`,
    DROP COLUMN `laborCost`,
    DROP COLUMN `materialCost`,
    DROP COLUMN `materialSignature`,
    DROP COLUMN `materialSignatureHash`,
    DROP COLUMN `profitMargin`,
    DROP COLUMN `sellingPrice`,
    DROP COLUMN `skuCode`,
    DROP COLUMN `skuName`,
    DROP COLUMN `totalCost`,
    DROP COLUMN `totalValue`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `available_quantity` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `craft_cost` DECIMAL(10, 2) NULL,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `created_by` VARCHAR(191) NOT NULL,
    ADD COLUMN `labor_cost` DECIMAL(10, 2) NULL,
    ADD COLUMN `material_cost` DECIMAL(10, 2) NULL,
    ADD COLUMN `material_signature` JSON NOT NULL,
    ADD COLUMN `material_signature_hash` VARCHAR(191) NOT NULL,
    ADD COLUMN `profit_margin` DECIMAL(5, 2) NULL,
    ADD COLUMN `selling_price` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `sku_code` VARCHAR(191) NOT NULL,
    ADD COLUMN `sku_name` VARCHAR(191) NOT NULL,
    ADD COLUMN `total_cost` DECIMAL(10, 2) NULL,
    ADD COLUMN `total_value` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `products` DROP COLUMN `createdAt`,
    DROP COLUMN `productCode`,
    DROP COLUMN `skuId`,
    DROP COLUMN `totalValue`,
    DROP COLUMN `unitPrice`,
    DROP COLUMN `updatedAt`,
    DROP COLUMN `userId`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `product_code` VARCHAR(191) NULL,
    ADD COLUMN `sku_id` VARCHAR(191) NULL,
    ADD COLUMN `total_value` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `unit_price` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL,
    ADD COLUMN `user_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `purchases` DROP COLUMN `aiRecognitionResult`,
    DROP COLUMN `beadDiameter`,
    DROP COLUMN `beadsPerString`,
    DROP COLUMN `createdAt`,
    DROP COLUMN `lastEditedById`,
    DROP COLUMN `minStockAlert`,
    DROP COLUMN `naturalLanguageInput`,
    DROP COLUMN `pieceCount`,
    DROP COLUMN `pricePerBead`,
    DROP COLUMN `pricePerGram`,
    DROP COLUMN `pricePerPiece`,
    DROP COLUMN `productName`,
    DROP COLUMN `productType`,
    DROP COLUMN `purchaseCode`,
    DROP COLUMN `purchaseDate`,
    DROP COLUMN `supplierId`,
    DROP COLUMN `totalBeads`,
    DROP COLUMN `totalPrice`,
    DROP COLUMN `unitPrice`,
    DROP COLUMN `unitType`,
    DROP COLUMN `updatedAt`,
    DROP COLUMN `userId`,
    ADD COLUMN `ai_recognition_result` JSON NULL,
    ADD COLUMN `bead_diameter` DECIMAL(10, 1) NULL,
    ADD COLUMN `beads_per_string` INTEGER NULL,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `last_edited_by_id` VARCHAR(191) NULL,
    ADD COLUMN `min_stock_alert` INTEGER NULL,
    ADD COLUMN `natural_language_input` TEXT NULL,
    ADD COLUMN `piece_count` INTEGER NULL,
    ADD COLUMN `price_per_bead` DECIMAL(10, 4) NULL,
    ADD COLUMN `price_per_gram` DECIMAL(10, 1) NULL,
    ADD COLUMN `price_per_piece` DECIMAL(10, 4) NULL,
    ADD COLUMN `product_name` VARCHAR(191) NOT NULL,
    ADD COLUMN `product_type` ENUM('LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED') NOT NULL DEFAULT 'BRACELET',
    ADD COLUMN `purchase_code` VARCHAR(191) NOT NULL,
    ADD COLUMN `purchase_date` DATETIME(3) NOT NULL,
    ADD COLUMN `supplier_id` VARCHAR(191) NULL,
    ADD COLUMN `total_beads` INTEGER NULL,
    ADD COLUMN `total_price` DECIMAL(10, 1) NULL,
    ADD COLUMN `unit_price` DECIMAL(10, 1) NULL,
    ADD COLUMN `unit_type` ENUM('PIECES', 'STRINGS', 'SLICES', 'ITEMS') NOT NULL DEFAULT 'STRINGS',
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL,
    ADD COLUMN `user_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `sku_inventory_logs` DROP COLUMN `createdAt`,
    DROP COLUMN `quantityAfter`,
    DROP COLUMN `quantityBefore`,
    DROP COLUMN `quantityChange`,
    DROP COLUMN `referenceId`,
    DROP COLUMN `referenceType`,
    DROP COLUMN `skuId`,
    DROP COLUMN `userId`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `quantity_after` INTEGER NOT NULL,
    ADD COLUMN `quantity_before` INTEGER NOT NULL,
    ADD COLUMN `quantity_change` INTEGER NOT NULL,
    ADD COLUMN `reference_id` VARCHAR(191) NULL,
    ADD COLUMN `reference_type` ENUM('PRODUCT', 'SALE', 'MANUAL', 'DESTROY', 'REFUND') NOT NULL,
    ADD COLUMN `sku_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `user_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `system_configs` DROP COLUMN `createdAt`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;

-- CreateIndex
CREATE INDEX `customer_notes_createdBy_fkey` ON `customer_notes`(`created_by`);

-- CreateIndex
CREATE INDEX `customer_notes_customer_id_idx` ON `customer_notes`(`customer_id`);

-- CreateIndex
CREATE INDEX `customer_purchases_customer_id_idx` ON `customer_purchases`(`customer_id`);

-- CreateIndex
CREATE INDEX `customer_purchases_purchase_date_idx` ON `customer_purchases`(`purchase_date`);

-- CreateIndex
CREATE INDEX `customer_purchases_sku_id_idx` ON `customer_purchases`(`sku_id`);

-- CreateIndex
CREATE INDEX `edit_logs_purchaseId_fkey` ON `edit_logs`(`purchase_id`);

-- CreateIndex
CREATE INDEX `edit_logs_userId_fkey` ON `edit_logs`(`user_id`);

-- CreateIndex
CREATE INDEX `financial_records_created_at_idx` ON `financial_records`(`created_at`);

-- CreateIndex
CREATE INDEX `financial_records_record_type_idx` ON `financial_records`(`record_type`);

-- CreateIndex
CREATE INDEX `financial_records_reference_type_reference_id_idx` ON `financial_records`(`reference_type`, `reference_id`);

-- CreateIndex
CREATE INDEX `financial_records_transaction_date_idx` ON `financial_records`(`transaction_date`);

-- CreateIndex
CREATE INDEX `financial_records_user_id_idx` ON `financial_records`(`user_id`);

-- CreateIndex
CREATE INDEX `material_usage_productId_fkey` ON `material_usage`(`product_id`);

-- CreateIndex
CREATE INDEX `material_usage_purchaseId_fkey` ON `material_usage`(`purchase_id`);

-- CreateIndex
CREATE UNIQUE INDEX `product_skus_sku_code_key` ON `product_skus`(`sku_code`);

-- CreateIndex
CREATE INDEX `product_skus_material_signature_hash_idx` ON `product_skus`(`material_signature_hash`);

-- CreateIndex
CREATE INDEX `product_skus_sku_code_idx` ON `product_skus`(`sku_code`);

-- CreateIndex
CREATE INDEX `product_skus_createdBy_fkey` ON `product_skus`(`created_by`);

-- CreateIndex
CREATE INDEX `products_skuId_fkey` ON `products`(`sku_id`);

-- CreateIndex
CREATE INDEX `products_userId_fkey` ON `products`(`user_id`);

-- CreateIndex
CREATE UNIQUE INDEX `purchases_purchase_code_key` ON `purchases`(`purchase_code`);

-- CreateIndex
CREATE INDEX `purchases_lastEditedById_fkey` ON `purchases`(`last_edited_by_id`);

-- CreateIndex
CREATE INDEX `purchases_supplierId_fkey` ON `purchases`(`supplier_id`);

-- CreateIndex
CREATE INDEX `purchases_userId_fkey` ON `purchases`(`user_id`);

-- CreateIndex
CREATE INDEX `sku_inventory_logs_sku_id_idx` ON `sku_inventory_logs`(`sku_id`);

-- CreateIndex
CREATE INDEX `sku_inventory_logs_created_at_idx` ON `sku_inventory_logs`(`created_at`);

-- CreateIndex
CREATE INDEX `sku_inventory_logs_userId_fkey` ON `sku_inventory_logs`(`user_id`);

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_last_edited_by_id_fkey` FOREIGN KEY (`last_edited_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `product_skus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `edit_logs` ADD CONSTRAINT `edit_logs_purchase_id_fkey` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `edit_logs` ADD CONSTRAINT `edit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_usage` ADD CONSTRAINT `material_usage_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_usage` ADD CONSTRAINT `material_usage_purchase_id_fkey` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_skus` ADD CONSTRAINT `product_skus_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku_inventory_logs` ADD CONSTRAINT `sku_inventory_logs_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `product_skus`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sku_inventory_logs` ADD CONSTRAINT `sku_inventory_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_notes` ADD CONSTRAINT `customer_notes_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_notes` ADD CONSTRAINT `customer_notes_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_purchases` ADD CONSTRAINT `customer_purchases_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_purchases` ADD CONSTRAINT `customer_purchases_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `product_skus`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_records` ADD CONSTRAINT `financial_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
