-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `user_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('BOSS', 'EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE',
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_login_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_user_name_key`(`user_name`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suppliers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contact` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `suppliers_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchases` (
    `id` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NULL,
    `weight` DECIMAL(10, 1) NULL,
    `quality` ENUM('AA', 'A', 'AB', 'B', 'C', 'UNKNOWN') NULL,
    `specification` DECIMAL(10, 1) NULL,
    `photos` JSON NOT NULL,
    `notes` TEXT NULL,
    `status` ENUM('ACTIVE', 'USED') NOT NULL DEFAULT 'ACTIVE',
    `ai_recognition_result` JSON NULL,
    `bead_diameter` DECIMAL(10, 1) NULL,
    `beads_per_string` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_edited_by_id` VARCHAR(191) NULL,
    `min_stock_alert` INTEGER NULL,
    `natural_language_input` TEXT NULL,
    `piece_count` INTEGER NULL,
    `price_per_bead` DECIMAL(10, 4) NULL,
    `price_per_gram` DECIMAL(10, 1) NULL,
    `price_per_piece` DECIMAL(10, 4) NULL,
    `purchase_name` VARCHAR(191) NOT NULL,
    `purchase_type` ENUM('LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED_MATERIAL') NOT NULL DEFAULT 'BRACELET',
    `purchase_code` VARCHAR(191) NOT NULL,
    `purchase_date` DATETIME(3) NOT NULL,
    `supplier_id` VARCHAR(191) NULL,
    `total_beads` INTEGER NULL,
    `total_price` DECIMAL(10, 1) NULL,
    `unit_price` DECIMAL(10, 1) NULL,
    `unit_type` ENUM('PIECES', 'STRINGS', 'SLICES', 'ITEMS') NOT NULL DEFAULT 'STRINGS',
    `updated_at` DATETIME(3) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `purchases_purchase_code_key`(`purchase_code`),
    INDEX `purchases_lastEditedById_fkey`(`last_edited_by_id`),
    INDEX `purchases_supplierId_fkey`(`supplier_id`),
    INDEX `purchases_userId_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `unit` VARCHAR(191) NOT NULL,
    `status` ENUM('MAKING', 'AVAILABLE', 'SOLD', 'OFFLINE') NOT NULL DEFAULT 'AVAILABLE',
    `location` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `images` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `product_code` VARCHAR(191) NULL,
    `sku_id` VARCHAR(191) NULL,
    `total_value` DECIMAL(10, 2) NOT NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,

    INDEX `products_skuId_fkey`(`sku_id`),
    INDEX `products_userId_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_configs` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_configs_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `edit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `details` TEXT NULL,
    `changed_fields` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `purchase_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,

    INDEX `edit_logs_purchaseId_fkey`(`purchase_id`),
    INDEX `edit_logs_userId_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materials` (
    `id` VARCHAR(191) NOT NULL,
    `material_code` VARCHAR(191) NOT NULL,
    `material_name` VARCHAR(191) NOT NULL,
    `material_type` ENUM('LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED_MATERIAL') NOT NULL,
    `quality` ENUM('AA', 'A', 'AB', 'B', 'C', 'UNKNOWN') NULL DEFAULT 'UNKNOWN',
    `bead_diameter` DECIMAL(5, 2) NULL,
    `bracelet_inner_diameter` DECIMAL(5, 2) NULL,
    `bracelet_bead_count` INTEGER NULL,
    `accessory_specification` VARCHAR(191) NULL,
    `finished_material_specification` VARCHAR(191) NULL,
    `original_quantity` INTEGER NOT NULL,
    `used_quantity` INTEGER NOT NULL DEFAULT 0,
    `inventory_unit` ENUM('PIECES', 'STRINGS', 'SLICES', 'ITEMS') NOT NULL,
    `unit_cost` DECIMAL(10, 4) NOT NULL,
    `total_cost` DECIMAL(12, 2) NOT NULL,
    `min_stock_alert` INTEGER NULL,
    `purchase_id` VARCHAR(191) NOT NULL,
    `supplier_id` VARCHAR(191) NULL,
    `photos` JSON NULL,
    `material_date` DATE NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `remaining_quantity` INTEGER NULL DEFAULT 0,
    `stock_status` VARCHAR(191) NULL DEFAULT 'SUFFICIENT',

    UNIQUE INDEX `materials_material_code_key`(`material_code`),
    INDEX `materials_material_code_idx`(`material_code`),
    INDEX `materials_material_name_idx`(`material_name`),
    INDEX `materials_material_type_quality_idx`(`material_type`, `quality`),
    INDEX `materials_purchase_id_idx`(`purchase_id`),
    INDEX `materials_supplier_id_idx`(`supplier_id`),
    INDEX `materials_material_date_idx`(`material_date`),
    INDEX `materials_material_name_material_code_idx`(`material_name`, `material_code`),
    INDEX `materials_stock_status_idx`(`stock_status`),
    INDEX `materials_remaining_quantity_idx`(`remaining_quantity`),
    INDEX `idx_materials_purchase_id`(`purchase_id`),
    INDEX `materials_created_by_fkey`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_usage` (
    `id` VARCHAR(191) NOT NULL,
    `action` ENUM('CREATE', 'USE', 'RETURN', 'ADJUST') NOT NULL DEFAULT 'CREATE',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `material_id` VARCHAR(191) NOT NULL,
    `purchase_id` VARCHAR(191) NULL,
    `quantity_used` INTEGER NOT NULL,
    `sku_id` VARCHAR(191) NULL,
    `total_cost` DECIMAL(10, 2) NULL,
    `unit_cost` DECIMAL(10, 4) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `material_usage_materialId_fkey`(`material_id`),
    INDEX `material_usage_skuId_fkey`(`sku_id`),
    INDEX `material_usage_purchaseId_fkey`(`purchase_id`),
    INDEX `material_usage_action_idx`(`action`),
    INDEX `idx_material_usage_material_id`(`material_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_skus` (
    `id` VARCHAR(191) NOT NULL,
    `total_quantity` INTEGER NOT NULL DEFAULT 0,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `photos` JSON NULL,
    `description` TEXT NULL,
    `specification` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `available_quantity` INTEGER NOT NULL DEFAULT 0,
    `craft_cost` DECIMAL(10, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(191) NOT NULL,
    `labor_cost` DECIMAL(10, 2) NULL,
    `material_cost` DECIMAL(10, 2) NULL,
    `material_signature` JSON NOT NULL,
    `material_signature_hash` VARCHAR(191) NOT NULL,
    `profit_margin` DECIMAL(5, 2) NULL,
    `selling_price` DECIMAL(10, 2) NOT NULL,
    `sku_code` VARCHAR(191) NOT NULL,
    `sku_name` VARCHAR(191) NOT NULL,
    `total_cost` DECIMAL(10, 2) NULL,
    `total_value` DECIMAL(10, 2) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_skus_sku_code_key`(`sku_code`),
    INDEX `product_skus_material_signature_hash_idx`(`material_signature_hash`),
    INDEX `product_skus_sku_code_idx`(`sku_code`),
    INDEX `product_skus_status_idx`(`status`),
    INDEX `product_skus_createdBy_fkey`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sku_inventory_logs` (
    `id` VARCHAR(191) NOT NULL,
    `action` ENUM('CREATE', 'SELL', 'ADJUST', 'DESTROY', 'REFUND') NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `quantity_after` INTEGER NOT NULL,
    `quantity_before` INTEGER NOT NULL,
    `quantity_change` INTEGER NOT NULL,
    `reference_id` VARCHAR(191) NULL,
    `reference_type` ENUM('PRODUCT', 'SALE', 'MANUAL', 'DESTROY', 'REFUND') NOT NULL,
    `sku_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,

    INDEX `sku_inventory_logs_sku_id_idx`(`sku_id`),
    INDEX `sku_inventory_logs_action_idx`(`action`),
    INDEX `sku_inventory_logs_created_at_idx`(`created_at`),
    INDEX `sku_inventory_logs_userId_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `resource` VARCHAR(191) NOT NULL,
    `details` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip_address` VARCHAR(191) NULL,
    `resource_id` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_notes` (
    `id` VARCHAR(191) NOT NULL,
    `category` ENUM('PREFERENCE', 'BEHAVIOR', 'CONTACT', 'OTHER') NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(191) NOT NULL,
    `customer_id` VARCHAR(191) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `customer_notes_category_idx`(`category`),
    INDEX `customer_notes_createdBy_fkey`(`created_by`),
    INDEX `customer_notes_customer_id_idx`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_purchases` (
    `id` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `total_price` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('ACTIVE', 'REFUNDED') NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `customer_id` VARCHAR(191) NOT NULL,
    `original_price` DECIMAL(10, 2) NULL,
    `purchase_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `refund_date` DATETIME(3) NULL,
    `refund_notes` TEXT NULL,
    `refund_reason` VARCHAR(191) NULL,
    `sale_channel` VARCHAR(191) NULL,
    `sku_id` VARCHAR(191) NOT NULL,
    `sku_name` VARCHAR(191) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `customer_purchases_customer_id_idx`(`customer_id`),
    INDEX `customer_purchases_purchase_date_idx`(`purchase_date`),
    INDEX `customer_purchases_sku_id_idx`(`sku_id`),
    INDEX `customer_purchases_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `address` TEXT NULL,
    `notes` TEXT NULL,
    `birthday` DATETIME(3) NULL,
    `wechat` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `province` VARCHAR(191) NULL,
    `average_order_value` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `customer_labels` JSON NULL,
    `days_since_first_purchase` INTEGER NULL,
    `days_since_last_purchase` INTEGER NULL,
    `first_purchase_date` DATETIME(3) NULL,
    `last_purchase_date` DATETIME(3) NULL,
    `primary_label` VARCHAR(191) NULL,
    `refund_count` INTEGER NOT NULL DEFAULT 0,
    `refund_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `total_all_orders` INTEGER NOT NULL DEFAULT 0,
    `total_orders` INTEGER NOT NULL DEFAULT 0,
    `total_purchases` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customers_phone_key`(`phone`),
    INDEX `customers_name_idx`(`name`),
    INDEX `customers_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial_records` (
    `id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `record_type` ENUM('INCOME', 'EXPENSE', 'REFUND', 'LOSS') NOT NULL,
    `reference_id` VARCHAR(191) NULL,
    `reference_type` ENUM('PURCHASE', 'SALE', 'REFUND', 'MANUAL') NOT NULL,
    `transaction_date` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,

    INDEX `financial_records_created_at_idx`(`created_at`),
    INDEX `financial_records_record_type_idx`(`record_type`),
    INDEX `financial_records_reference_type_reference_id_idx`(`reference_type`, `reference_id`),
    INDEX `financial_records_transaction_date_idx`(`transaction_date`),
    INDEX `financial_records_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
ALTER TABLE `materials` ADD CONSTRAINT `materials_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materials` ADD CONSTRAINT `materials_purchase_id_fkey` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materials` ADD CONSTRAINT `materials_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_usage` ADD CONSTRAINT `material_usage_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_usage` ADD CONSTRAINT `material_usage_purchase_id_fkey` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_usage` ADD CONSTRAINT `material_usage_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `product_skus`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
