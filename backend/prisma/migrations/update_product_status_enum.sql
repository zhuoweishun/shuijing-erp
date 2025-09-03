-- 更新ProductStatus枚举值
-- 将原有的IN_STOCK、LOW_STOCK、OUT_OF_STOCK、DISCONTINUED
-- 改为MAKING、AVAILABLE、SOLD、OFFLINE

-- 1. 先添加新的枚举值到现有枚举中
ALTER TABLE `products` MODIFY COLUMN `status` ENUM('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED', 'MAKING', 'AVAILABLE', 'SOLD', 'OFFLINE') NOT NULL DEFAULT 'IN_STOCK';

-- 2. 更新现有数据的状态映射
-- 将旧状态映射到新状态
UPDATE `products` SET `status` = 'AVAILABLE' WHERE `status` = 'IN_STOCK';
UPDATE `products` SET `status` = 'AVAILABLE' WHERE `status` = 'LOW_STOCK';
UPDATE `products` SET `status` = 'OFFLINE' WHERE `status` = 'OUT_OF_STOCK';
UPDATE `products` SET `status` = 'OFFLINE' WHERE `status` = 'DISCONTINUED';

-- 3. 移除旧的枚举值，只保留新的
ALTER TABLE `products` MODIFY COLUMN `status` ENUM('MAKING', 'AVAILABLE', 'SOLD', 'OFFLINE') NOT NULL DEFAULT 'AVAILABLE';

-- 4. 验证更新结果
SELECT status, COUNT(*) as count FROM `products` GROUP BY status;