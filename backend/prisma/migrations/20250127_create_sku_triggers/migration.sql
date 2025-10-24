-- SKU制作触发器：分别记录原材料成本、人工费、工艺费
CREATE TRIGGER tr_sku_create_financial
AFTER INSERT ON product_skus
FOR EACH ROW
BEGIN
    -- 记录原材料成本
    IF NEW.material_cost > 0 THEN
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
            NEW.material_cost,
            CONCAT('SKU制作原材料成本 - ', NEW.sku_name, ' (', NEW.sku_code, ')'),
            '原材料成本',
            'EXPENSE',
            NEW.id,
            'MANUAL',
            NOW(),
            'sku_create_material_cost',
            DATE(NOW()),
            JSON_OBJECT(
                'cost_type', 'material_cost',
                'sku_code', NEW.sku_code,
                'sku_name', NEW.sku_name,
                'total_quantity', NEW.total_quantity,
                'unit_price', NEW.unit_price,
                'material_signature_hash', NEW.material_signature_hash
            ),
            NEW.created_by,
            NOW(),
            NOW()
        );
    END IF;
    
    -- 记录人工费
    IF NEW.labor_cost > 0 THEN
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
            NEW.labor_cost,
            CONCAT('SKU制作人工费 - ', NEW.sku_name, ' (', NEW.sku_code, ')'),
            '人工费',
            'EXPENSE',
            NEW.id,
            'MANUAL',
            NOW(),
            'sku_create_labor_cost',
            DATE(NOW()),
            JSON_OBJECT(
                'cost_type', 'labor_cost',
                'sku_code', NEW.sku_code,
                'sku_name', NEW.sku_name,
                'total_quantity', NEW.total_quantity,
                'unit_price', NEW.unit_price,
                'material_signature_hash', NEW.material_signature_hash
            ),
            NEW.created_by,
            NOW(),
            NOW()
        );
    END IF;
    
    -- 记录工艺费
    IF NEW.craft_cost > 0 THEN
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
            NEW.craft_cost,
            CONCAT('SKU制作工艺费 - ', NEW.sku_name, ' (', NEW.sku_code, ')'),
            '工艺费',
            'EXPENSE',
            NEW.id,
            'MANUAL',
            NOW(),
            'sku_create_craft_cost',
            DATE(NOW()),
            JSON_OBJECT(
                'cost_type', 'craft_cost',
                'sku_code', NEW.sku_code,
                'sku_name', NEW.sku_name,
                'total_quantity', NEW.total_quantity,
                'unit_price', NEW.unit_price,
                'material_signature_hash', NEW.material_signature_hash
            ),
            NEW.created_by,
            NOW(),
            NOW()
        );
    END IF;
END;

-- SKU销售触发器：记录销售收入
CREATE TRIGGER tr_sku_sale_financial
AFTER INSERT ON customer_purchases
FOR EACH ROW
BEGIN
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
        NEW.total_price,
        CONCAT('SKU销售收入 - ', NEW.sku_name, ' x', NEW.quantity),
        '销售收入',
        'INCOME',
        NEW.id,
        'SALE',
        NEW.purchase_date,
        'sku_sale',
        DATE(NEW.purchase_date),
        JSON_OBJECT(
            'customer_id', NEW.customer_id,
            'sku_id', NEW.sku_id,
            'sku_name', NEW.sku_name,
            'quantity', NEW.quantity,
            'unit_price', NEW.unit_price,
            'sale_channel', NEW.sale_channel
        ),
        (SELECT created_by FROM product_skus WHERE id = NEW.sku_id LIMIT 1),
        NOW(),
        NOW()
    );
END;