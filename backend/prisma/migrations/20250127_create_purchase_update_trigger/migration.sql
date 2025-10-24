-- 创建采购编辑触发器，处理采购价格调整的财务记录
-- 根据财务管理系统重构技术架构文档设计

-- 采购编辑触发器：在采购价格调整时自动创建财务调整记录
CREATE TRIGGER tr_purchase_update_financial
AFTER UPDATE ON purchases
FOR EACH ROW
INSERT INTO financial_records (
    id,
    amount,
    description,
    category,
    notes,
    created_at,
    record_type,
    reference_id,
    reference_type,
    transaction_date,
    updated_at,
    user_id,
    business_operation,
    business_date,
    metadata
)
SELECT 
    CONCAT('fin_', SUBSTRING(UUID(), 1, 8), '_', UNIX_TIMESTAMP()),
    ABS(COALESCE(NEW.total_price, 0) - COALESCE(OLD.total_price, 0)),
    CONCAT(
        CASE 
            WHEN (COALESCE(NEW.total_price, 0) - COALESCE(OLD.total_price, 0)) > 0 THEN '采购价格上调 - '
            ELSE '采购价格下调 - '
        END,
        NEW.purchase_name
    ),
    CASE 
        WHEN (COALESCE(NEW.total_price, 0) - COALESCE(OLD.total_price, 0)) > 0 THEN '采购调整-增加'
        ELSE '采购调整-减少'
    END,
    CONCAT(
        '原价格: ¥', COALESCE(OLD.total_price, 0),
        ', 新价格: ¥', COALESCE(NEW.total_price, 0),
        ', 差额: ¥', (COALESCE(NEW.total_price, 0) - COALESCE(OLD.total_price, 0)),
        ', 供应商: ', COALESCE((SELECT name FROM suppliers WHERE id = NEW.supplier_id), '未知')
    ),
    NOW(),
    CASE 
        WHEN (COALESCE(NEW.total_price, 0) - COALESCE(OLD.total_price, 0)) > 0 THEN 'EXPENSE'
        ELSE 'INCOME'
    END,
    NEW.id,
    'PURCHASE',
    NEW.purchase_date,
    NOW(),
    COALESCE(NEW.last_edited_by_id, NEW.user_id),
    'PURCHASE_UPDATE',
    DATE(NEW.purchase_date),
    JSON_OBJECT(
        'purchase_id', NEW.id,
        'purchase_name', NEW.purchase_name,
        'old_total_price', COALESCE(OLD.total_price, 0),
        'new_total_price', COALESCE(NEW.total_price, 0),
        'price_difference', (COALESCE(NEW.total_price, 0) - COALESCE(OLD.total_price, 0)),
        'supplier_id', NEW.supplier_id,
        'supplier_name', COALESCE((SELECT name FROM suppliers WHERE id = NEW.supplier_id), '未知'),
        'edited_by', COALESCE(NEW.last_edited_by_id, NEW.user_id),
        'purchase_code', NEW.purchase_code
    )
WHERE COALESCE(OLD.total_price, 0) != COALESCE(NEW.total_price, 0);

-- 添加触发器说明注释
-- tr_purchase_update_financial: 采购价格调整时自动创建财务调整记录