-- 创建采购录入触发器，实现采购保存后自动记录财务支出
-- 根据财务管理系统重构技术架构文档设计

-- 采购录入触发器：在新增采购记录时自动创建财务支出记录
CREATE TRIGGER tr_purchase_create_financial
AFTER INSERT ON purchases
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
) VALUES (
    CONCAT('fin_', SUBSTRING(UUID(), 1, 8), '_', UNIX_TIMESTAMP()),
    COALESCE(NEW.total_price, 0.00),
    CONCAT('采购支出 - ', NEW.purchase_name),
    '采购支出',
    CONCAT(
        '供应商: ', COALESCE((SELECT name FROM suppliers WHERE id = NEW.supplier_id), '未知'), 
        ', 规格: ', COALESCE(NEW.specification, '无'),
        ', 数量: ', COALESCE(NEW.piece_count, NEW.quantity, 0),
        ', 单位: ', NEW.unit_type
    ),
    NOW(),
    'EXPENSE',
    NEW.id,
    'PURCHASE',
    NEW.purchase_date,
    NOW(),
    NEW.user_id,
    'PURCHASE_CREATE',
    DATE(NEW.purchase_date),
    JSON_OBJECT(
        'purchase_id', NEW.id,
        'purchase_name', NEW.purchase_name,
        'purchase_type', NEW.purchase_type,
        'supplier_id', NEW.supplier_id,
        'supplier_name', COALESCE((SELECT name FROM suppliers WHERE id = NEW.supplier_id), '未知'),
        'unit_price', COALESCE(NEW.unit_price, 0),
        'quantity', COALESCE(NEW.piece_count, NEW.quantity, 0),
        'unit_type', NEW.unit_type,
        'quality', COALESCE(NEW.quality, 'UNKNOWN'),
        'specification', COALESCE(NEW.specification, 0),
        'bead_diameter', COALESCE(NEW.bead_diameter, 0),
        'purchase_code', NEW.purchase_code
    )
);

-- 添加触发器说明注释
-- tr_purchase_create_financial: 采购录入时自动创建财务支出记录