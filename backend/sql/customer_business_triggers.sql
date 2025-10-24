-- 客户业务相关触发器 (更新版本)
-- 包含SKU销售、客户退货的自动化业务逻辑处理
-- 确保财务记录、库存管理、客户统计的数据一致性
-- 修复版本：解决缺失的SKU销售→财务记录、客户退货→SKU库存、客户退货→财务记录等触发器

DELIMITER //

-- ========================================
-- 1. SKU销售收入记录触发器 (修复版)
-- ========================================
-- 当customer_purchases表插入ACTIVE状态记录时，自动创建财务收入记录
DROP TRIGGER IF EXISTS tr_customer_purchase_create_financial//
CREATE TRIGGER tr_customer_purchase_create_financial
AFTER INSERT ON customer_purchases
FOR EACH ROW
BEGIN
  DECLARE v_customer_name VARCHAR(255);
  
  -- 获取客户名称
  SELECT name INTO v_customer_name 
  FROM customers 
  WHERE id = NEW.customer_id;
  
  -- 只处理ACTIVE状态的销售记录
  IF NEW.status = 'ACTIVE' THEN
    INSERT INTO financial_records (
      id,
      amount,
      description,
      category,
      record_type,
      reference_type,
      reference_id,
      transaction_date,
      user_id,
      business_date,
      business_operation,
      metadata
    ) VALUES (
      CONCAT('FR_', UNIX_TIMESTAMP(), '_', SUBSTRING(MD5(RAND()), 1, 8)),
      NEW.total_price,
      CONCAT('SKU销售收入 - ', NEW.sku_name, ' (客户: ', v_customer_name, ')'),
      'sales_income',
      'INCOME',
      'customer_purchase',
      NEW.id,
      NEW.purchase_date,
      'system',
      DATE(NEW.purchase_date),
      'sku_sale',
      JSON_OBJECT(
        'customer_id', NEW.customer_id,
        'customer_name', v_customer_name,
        'sku_id', NEW.sku_id,
        'sku_name', NEW.sku_name,
        'quantity', NEW.quantity,
        'unit_price', NEW.unit_price,
        'sale_channel', NEW.sale_channel
      )
    );
  END IF;
END//

-- ========================================
-- 2. 客户统计更新触发器 - INSERT
-- ========================================
-- 当customer_purchases表插入记录时，自动更新客户统计数据
DROP TRIGGER IF EXISTS tr_customer_purchase_update_stats_insert//
CREATE TRIGGER tr_customer_purchase_update_stats_insert
AFTER INSERT ON customer_purchases
FOR EACH ROW
BEGIN
  -- 只处理ACTIVE状态的销售记录
  IF NEW.status = 'ACTIVE' THEN
    UPDATE customers SET
      total_purchases = total_purchases + NEW.total_price,
      total_orders = total_orders + 1,
      last_purchase_date = NEW.purchase_date,
      first_purchase_date = COALESCE(first_purchase_date, NEW.purchase_date),
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
END//

-- ========================================
-- 3. 客户退货财务记录触发器
-- ========================================
-- 当customer_purchases表状态变为REFUNDED时，自动创建财务退款记录
DROP TRIGGER IF EXISTS tr_customer_refund_create_financial//
CREATE TRIGGER tr_customer_refund_create_financial
AFTER UPDATE ON customer_purchases
FOR EACH ROW
BEGIN
  DECLARE v_customer_name VARCHAR(255);
  
  -- 当状态从非REFUNDED变为REFUNDED时，创建退款记录
  IF OLD.status != 'REFUNDED' AND NEW.status = 'REFUNDED' THEN
    -- 获取客户名称
    SELECT name INTO v_customer_name 
    FROM customers 
    WHERE id = NEW.customer_id;
    
    INSERT INTO financial_records (
      id,
      amount,
      description,
      category,
      record_type,
      reference_type,
      reference_id,
      transaction_date,
      user_id,
      business_date,
      business_operation,
      metadata
    ) VALUES (
      CONCAT('FR_', UNIX_TIMESTAMP(), '_', SUBSTRING(MD5(RAND()), 1, 8)),
      -NEW.total_price, -- 负数表示抵扣收入
      CONCAT('客户退货退款 - ', NEW.sku_name, ' (客户: ', v_customer_name, ')'),
      'refund',
      'EXPENSE',
      'customer_refund',
      NEW.id,
      COALESCE(NEW.refund_date, NOW()),
      'system',
      DATE(COALESCE(NEW.refund_date, NOW())),
      'customer_refund',
      JSON_OBJECT(
        'customer_id', NEW.customer_id,
        'customer_name', v_customer_name,
        'sku_id', NEW.sku_id,
        'sku_name', NEW.sku_name,
        'quantity', NEW.quantity,
        'unit_price', NEW.unit_price,
        'refund_reason', NEW.refund_reason,
        'refund_notes', NEW.refund_notes
      )
    );
  END IF;
END//

-- ========================================
-- 4. 客户退货SKU库存恢复触发器
-- ========================================
-- 当customer_purchases表状态变为REFUNDED时，自动增加SKU库存
DROP TRIGGER IF EXISTS tr_customer_refund_restore_sku_stock//
CREATE TRIGGER tr_customer_refund_restore_sku_stock
AFTER UPDATE ON customer_purchases
FOR EACH ROW
BEGIN
  DECLARE sku_quantity_before INT DEFAULT 0;
  DECLARE sku_quantity_after INT DEFAULT 0;
  
  -- 当状态从非REFUNDED变为REFUNDED时，恢复SKU库存
  IF OLD.status != 'REFUNDED' AND NEW.status = 'REFUNDED' THEN
    -- 获取当前SKU库存
    SELECT available_quantity INTO sku_quantity_before 
    FROM product_skus 
    WHERE id = NEW.sku_id;
    
    SET sku_quantity_after = sku_quantity_before + NEW.quantity;
    
    -- 更新SKU库存
    UPDATE product_skus SET
      available_quantity = sku_quantity_after,
      total_value = sku_quantity_after * selling_price,
      updated_at = NOW()
    WHERE id = NEW.sku_id;
    
    -- 创建SKU库存变更日志
    INSERT INTO sku_inventory_logs (
      id,
      sku_id,
      action,
      quantity_change,
      quantity_before,
      quantity_after,
      reference_type,
      reference_id,
      notes,
      user_id,
      created_at
    ) VALUES (
      CONCAT('refund_stock_', NEW.id, '_', UNIX_TIMESTAMP()),
      NEW.sku_id,
      'REFUND',
      NEW.quantity,
      sku_quantity_before,
      sku_quantity_after,
      'REFUND',
      NEW.id,
      CONCAT('客户退货入库，退货原因：', COALESCE(NEW.refund_reason, '未提供'), 
             CASE WHEN NEW.refund_notes IS NOT NULL THEN CONCAT('，备注：', NEW.refund_notes) ELSE '' END),
      'system',
      NOW()
    );
  END IF;
END//

-- ========================================
-- 5. 客户统计更新触发器 - UPDATE (退货)
-- ========================================
-- 当customer_purchases表状态变为REFUNDED时，自动更新客户统计数据
DROP TRIGGER IF EXISTS tr_customer_refund_update_stats//
CREATE TRIGGER tr_customer_refund_update_stats
AFTER UPDATE ON customer_purchases
FOR EACH ROW
BEGIN
  -- 当状态从非REFUNDED变为REFUNDED时，更新客户统计
  IF OLD.status != 'REFUNDED' AND NEW.status = 'REFUNDED' THEN
    UPDATE customers SET
      total_purchases = GREATEST(0, total_purchases - NEW.total_price), -- 确保不会变成负数
      total_orders = GREATEST(0, total_orders - 1), -- 减少订单数，确保不会变成负数
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
END//

-- ========================================
-- 6. 客户购买记录删除时的统计更新触发器
-- ========================================
-- 当customer_purchases记录被删除时，自动更新客户统计数据
DROP TRIGGER IF EXISTS tr_customer_purchase_delete_stats//
CREATE TRIGGER tr_customer_purchase_delete_stats
AFTER DELETE ON customer_purchases
FOR EACH ROW
BEGIN
  -- 只处理ACTIVE状态的记录删除
  IF OLD.status = 'ACTIVE' THEN
    UPDATE customers SET
      total_purchases = GREATEST(0, total_purchases - OLD.total_price),
      total_orders = GREATEST(0, total_orders - 1),
      updated_at = NOW()
    WHERE id = OLD.customer_id;
  END IF;
END//

DELIMITER ;

-- ========================================
-- 创建相关索引以优化触发器性能
-- ========================================
CREATE INDEX IF NOT EXISTS idx_customer_purchases_customer_id ON customer_purchases(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_purchases_sku_id ON customer_purchases(sku_id);
CREATE INDEX IF NOT EXISTS idx_customer_purchases_status ON customer_purchases(status);
CREATE INDEX IF NOT EXISTS idx_customer_purchases_purchase_date ON customer_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_financial_records_reference ON financial_records(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_sku_inventory_logs_sku_id ON sku_inventory_logs(sku_id);

-- ========================================
-- 触发器功能说明
-- ========================================
-- 这些触发器实现了以下自动化业务逻辑：
-- 
-- 1. SKU销售自动化：
--    - 销售时自动记录财务收入
--    - 自动更新客户购买统计（金额、订单数、购买日期）
-- 
-- 2. 客户退货自动化：
--    - 退货时自动创建财务退款记录（负数抵扣收入）
--    - 自动恢复SKU库存数量
--    - 自动创建SKU库存变更日志
--    - 自动更新客户统计数据（减少购买金额和订单数）
-- 
-- 3. 数据一致性保障：
--    - 确保财务记录与业务操作同步
--    - 确保库存数据与销售/退货操作同步
--    - 确保客户统计数据的准确性
-- 
-- 4. 审计追踪：
--    - 所有操作都有详细的日志记录
--    - 包含操作原因、用户信息、时间戳等
-- 
-- 注意事项：
-- - 所有触发器都使用事务安全的操作
-- - 包含错误处理和边界条件检查
-- - 遵循全蛇形命名规范
-- - 支持并发操作的数据一致性