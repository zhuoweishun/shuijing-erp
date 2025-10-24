-- 修复SKU销毁触发器中的reference_type问题
-- 将'SKU_DESTROY'改为'MANUAL'

DROP TRIGGER IF EXISTS tr_sku_destroy_financial;

DELIMITER //

CREATE TRIGGER tr_sku_destroy_financial
AFTER INSERT ON sku_inventory_logs
FOR EACH ROW
BEGIN
    DECLARE sku_material_cost DECIMAL(10,2) DEFAULT 0;
    DECLARE sku_name_var VARCHAR(255);
    DECLARE sku_code_var VARCHAR(255);
    DECLARE total_sku_quantity INT DEFAULT 0;
    DECLARE destroyed_quantity INT DEFAULT 0;
    DECLARE material_loss_amount DECIMAL(10,2) DEFAULT 0;

    -- 只处理销毁操作
    IF NEW.action = 'DESTROY' THEN
    -- 获取SKU的原材料成本和基本信息
    SELECT material_cost, sku_name, sku_code, total_quantity
    INTO sku_material_cost, sku_name_var, sku_code_var, total_sku_quantity
    FROM product_skus
    WHERE id = NEW.sku_id;

    -- 计算销毁数量（取绝对值，因为销毁是负数变化）
    SET destroyed_quantity = ABS(NEW.quantity_change);

    -- 计算原材料损耗金额（按比例计算）
    IF total_sku_quantity > 0 AND sku_material_cost > 0 THEN
        SET material_loss_amount = (sku_material_cost * destroyed_quantity) / total_sku_quantity;

        -- 记录原材料损耗
        INSERT INTO financial_records (
            id,
            amount,
            description,
            category,
            record_type,
            reference_id,
            reference_type,
            transaction_date,
            business_operation,
            business_date,
            metadata,
            user_id,
            created_at,
            updated_at
        ) VALUES (
            CONCAT('fr_', UUID()),
            material_loss_amount,
            CONCAT('SKU销毁原材料损耗 - ', sku_name_var, ' (', sku_code_var, ') x', destroyed_quantity),
            '原材料损耗',
            'EXPENSE',
            NEW.id,
            'MANUAL',  -- 修改为有效的枚举值
            NOW(),
            'sku_destroy_material_loss',
            DATE(NOW()),
            JSON_OBJECT(
                'sku_id', NEW.sku_id,
                'sku_code', sku_code_var,
                'sku_name', sku_name_var,
                'destroyed_quantity', destroyed_quantity,
                'total_sku_quantity', total_sku_quantity,
                'unit_material_cost', sku_material_cost / total_sku_quantity,
                'destroy_reason', NEW.notes,
                'reference_id', NEW.reference_id,
                'reference_type', NEW.reference_type
            ),
            NEW.user_id,
            NOW(),
            NOW()
        );
    END IF;
    END IF;
END//

DELIMITER ;