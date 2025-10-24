-- 客户退货触发器：记录退款到财务表
-- 当客户购买记录状态更新为REFUNDED时触发
CREATE TRIGGER tr_customer_refund_financial
AFTER UPDATE ON customer_purchases
FOR EACH ROW
BEGIN
    DECLARE refund_amount DECIMAL(10,2);
    DECLARE customer_name VARCHAR(255);
    
    -- 只处理状态从非REFUNDED变为REFUNDED的情况
    IF OLD.status != 'REFUNDED' AND NEW.status = 'REFUNDED' THEN
        
        -- 获取客户姓名
        SELECT name INTO customer_name
        FROM customers 
        WHERE id = NEW.customer_id;
        
        -- 计算退款金额（如果没有设置退款金额，使用原购买金额）
        SET refund_amount = COALESCE(NEW.total_price, OLD.total_price);
        
        -- 记录退款支出
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
            refund_amount,
            CONCAT('客户退货退款 - ', customer_name, ' - ', NEW.sku_name, ' x', NEW.quantity),
            '退货退款',
            'EXPENSE',
            NEW.id,
            'CUSTOMER_REFUND',
            COALESCE(NEW.refund_date, NOW()),
            'customer_refund',
            DATE(COALESCE(NEW.refund_date, NOW())),
            JSON_OBJECT(
                'customer_id', NEW.customer_id,
                'customer_name', customer_name,
                'sku_id', NEW.sku_id,
                'sku_name', NEW.sku_name,
                'quantity', NEW.quantity,
                'original_price', NEW.original_price,
                'refund_reason', NEW.refund_reason,
                'refund_notes', NEW.refund_notes,
                'original_purchase_date', OLD.purchase_date,
                'refund_date', NEW.refund_date
            ),
            (SELECT created_by FROM product_skus WHERE id = NEW.sku_id LIMIT 1),
            NOW(),
            NOW()
        );
    END IF;
END;