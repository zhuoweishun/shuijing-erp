/*
  Warnings:

  - You are about to drop the column `material_type` on the `purchases` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `purchases` DROP COLUMN `material_type`,
    ADD COLUMN `material_type` ENUM('LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED') NOT NULL DEFAULT 'BRACELET';
