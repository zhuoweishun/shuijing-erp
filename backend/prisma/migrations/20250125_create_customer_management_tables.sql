-- 客户管理系统数据库迁移
-- 创建时间: 2025-01-25
-- 描述: 添加客户表和客户购买历史表，支持客户信息管理和购买记录追踪

-- 1. 创建客户表
CREATE TABLE customers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '客户姓名',
  phone VARCHAR(20) UNIQUE NOT NULL COMMENT '客户手机号（唯一标识）',
  address TEXT COMMENT '客户地址',
  notes TEXT COMMENT '客户备注信息',
  totalPurchases DECIMAL(10,2) DEFAULT 0 COMMENT '累计购买金额',
  totalOrders INT DEFAULT 0 COMMENT '累计订单数量',
  firstPurchaseDate TIMESTAMP NULL COMMENT '首次购买日期',
  lastPurchaseDate TIMESTAMP NULL COMMENT '最后购买日期',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 索引
  INDEX idx_customers_phone (phone),
  INDEX idx_customers_name (name),
  INDEX idx_customers_createdAt (createdAt DESC),
  INDEX idx_customers_lastPurchaseDate (lastPurchaseDate DESC),
  FULLTEXT INDEX idx_customers_search (name, phone, address, notes)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户信息表';

-- 2. 创建客户购买历史表
CREATE TABLE customerPurchases (
  id VARCHAR(36) PRIMARY KEY,
  customerId VARCHAR(36) NOT NULL COMMENT '客户ID',
  skuId VARCHAR(36) NOT NULL COMMENT 'SKU ID',
  skuName VARCHAR(200) NOT NULL COMMENT 'SKU名称（冗余字段，便于查询）',
  quantity INT NOT NULL COMMENT '购买数量',
  unit_price DECIMAL(10,2) NOT NULL COMMENT '单价',
  total_price DECIMAL(10,2) NOT NULL COMMENT '总价',
  saleChannel VARCHAR(50) COMMENT '销售渠道',
  notes TEXT COMMENT '购买备注',
  purchaseDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '购买时间',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
  
  -- 外键约束
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (skuId) REFERENCES product_skus(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  
  -- 索引
  INDEX idx_customerPurchases_customerId (customerId),
  INDEX idx_customerPurchases_skuId (skuId),
  INDEX idx_customerPurchases_purchaseDate (purchaseDate DESC),
  INDEX idx_customerPurchases_totalPrice (total_price DESC),
  INDEX idx_customerPurchases_createdAt (createdAt DESC),
  FULLTEXT INDEX idx_customerPurchases_search (skuName, notes)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户购买历史表';

-- 3. 修改现有的sku_inventory_logs表，添加客户关联（可选）
ALTER TABLE sku_inventory_logs 
ADD COLUMN customerId VARCHAR(36) NULL COMMENT '关联客户ID（销售操作时记录）' AFTER reference_id,
ADD INDEX idx_sku_logs_customerId (customerId);

-- 4. 为客户表添加外键约束到sku_inventory_logs（如果需要）
-- ALTER TABLE sku_inventory_logs 
-- ADD FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. 创建客户统计视图
CREATE VIEW customerStats AS
SELECT 
  c.id,
  c.name,
  c.phone,
  c.address,
  c.totalPurchases,
  c.totalOrders,
  c.firstPurchaseDate,
  c.lastPurchaseDate,
  c.createdAt,
  COUNT(cp.id) as actualOrderCount,
  SUM(cp.total_price) as actualTotalAmount,
  AVG(cp.total_price) as avgOrderAmount,
  MAX(cp.purchaseDate) as latestPurchaseDate,
  MIN(cp.purchaseDate) as earliestPurchaseDate,
  DATEDIFF(NOW(), MAX(cp.purchaseDate)) as daysSinceLastPurchase
FROM customers c
LEFT JOIN customerPurchases cp ON c.id = cp.customerId
GROUP BY c.id;

-- 6. 创建客户购买明细视图
CREATE VIEW customerPurchaseDetails AS
SELECT 
  cp.id as purchaseId,
  c.id as customerId,
  c.name as customerName,
  c.phone as customerPhone,
  cp.skuId,
  cp.skuName,
  ps.skuCode,
  ps.specification,
  cp.quantity,
  cp.unit_price,
  cp.total_price,
  cp.saleChannel,
  cp.notes as purchaseNotes,
  cp.purchaseDate,
  ps.materialCost,
  ps.totalCost as skuCost,
  (cp.total_price - ps.totalCost * cp.quantity) as profitAmount,
  CASE 
    WHEN ps.totalCost > 0 THEN 
      ((cp.total_price - ps.totalCost * cp.quantity) / cp.total_price * 100)
    ELSE 0 
  END as profitMargin
FROM customerPurchases cp
INNER JOIN customers c ON cp.customerId = c.id
INNER JOIN product_skus ps ON cp.skuId = ps.id
ORDER BY cp.purchaseDate DESC;

-- 7. 插入系统配置
INSERT INTO system_configs (id, `key`, `value`, description) VALUES
(UUID(), 'customer_code_prefix', 'CUS', '客户编号前缀'),
(UUID(), 'customer_phone_required', 'true', '客户手机号是否必填'),
(UUID(), 'customer_auto_create', 'true', '销售时是否自动创建客户'),
(UUID(), 'customer_duplicate_phone_check', 'true', '是否检查重复手机号');

-- 8. 创建触发器：自动更新客户统计信息
DELIMITER //

CREATE TRIGGER update_customer_stats_after_purchase
AFTER INSERT ON customerPurchases
FOR EACH ROW
BEGIN
  UPDATE customers 
  SET 
    totalPurchases = totalPurchases + NEW.total_price,
    totalOrders = totalOrders + 1,
    lastPurchaseDate = NEW.purchaseDate,
    firstPurchaseDate = CASE 
      WHEN firstPurchaseDate IS NULL OR NEW.purchaseDate < firstPurchaseDate 
      THEN NEW.purchaseDate 
      ELSE firstPurchaseDate 
    END,
    updatedAt = CURRENT_TIMESTAMP
  WHERE id = NEW.customerId;
END//

CREATE TRIGGER update_customer_stats_after_purchase_update
AFTER UPDATE ON customerPurchases
FOR EACH ROW
BEGIN
  -- 重新计算客户统计信息
  UPDATE customers c
  SET 
    totalPurchases = (
      SELECT COALESCE(SUM(total_price), 0) 
      FROM customerPurchases 
      WHERE customerId = c.id
    ),
    totalOrders = (
      SELECT COUNT(*) 
      FROM customerPurchases 
      WHERE customerId = c.id
    ),
    firstPurchaseDate = (
      SELECT MIN(purchaseDate) 
      FROM customerPurchases 
      WHERE customerId = c.id
    ),
    lastPurchaseDate = (
      SELECT MAX(purchaseDate) 
      FROM customerPurchases 
      WHERE customerId = c.id
    ),
    updatedAt = CURRENT_TIMESTAMP
  WHERE id = NEW.customerId OR id = OLD.customerId;
END//

CREATE TRIGGER update_customer_stats_after_purchase_delete
AFTER DELETE ON customerPurchases
FOR EACH ROW
BEGIN
  -- 重新计算客户统计信息
  UPDATE customers c
  SET 
    totalPurchases = (
      SELECT COALESCE(SUM(total_price), 0) 
      FROM customerPurchases 
      WHERE customerId = c.id
    ),
    totalOrders = (
      SELECT COUNT(*) 
      FROM customerPurchases 
      WHERE customerId = c.id
    ),
    firstPurchaseDate = (
      SELECT MIN(purchaseDate) 
      FROM customerPurchases 
      WHERE customerId = c.id
    ),
    lastPurchaseDate = (
      SELECT MAX(purchaseDate) 
      FROM customerPurchases 
      WHERE customerId = c.id
    ),
    updatedAt = CURRENT_TIMESTAMP
  WHERE id = OLD.customerId;
END//

DELIMITER ;

-- 迁移完成
-- 注意：执行此迁移前请确保product_skus表已存在
-- 建议在生产环境执行前先在测试环境验证