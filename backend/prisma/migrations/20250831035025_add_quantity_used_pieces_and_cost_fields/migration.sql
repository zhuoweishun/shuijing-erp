-- AlterTable
ALTER TABLE `material_usage` ADD COLUMN `quantityUsedPieces` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `totalCost` DECIMAL(10, 2) NULL,
    ADD COLUMN `unitCost` DECIMAL(10, 4) NULL,
    MODIFY `quantityUsedBeads` INTEGER NOT NULL DEFAULT 0;
