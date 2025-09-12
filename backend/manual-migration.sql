-- 手动迁移采购状态的SQL脚本

-- 1. 先修改枚举类型，添加新的状态值
ALTER TABLE purchases MODIFY COLUMN status ENUM('PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED', 'ACTIVE', 'USED');

-- 2. 将所有现有状态更新为ACTIVE
UPDATE purchases SET status = 'ACTIVE' WHERE status IN ('PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED');

-- 3. 修改枚举类型，只保留新的状态值
ALTER TABLE purchases MODIFY COLUMN status ENUM('ACTIVE', 'USED') DEFAULT 'ACTIVE';

-- 4. 验证结果
SELECT status, COUNT(*) as count FROM purchases GROUP BY status;