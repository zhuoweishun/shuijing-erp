-- 创建数据一致性检查存储过程
CREATE PROCEDURE check_financial_data_consistency()
BEGIN
    DECLARE inconsistency_count INT DEFAULT 0;
    
    -- 临时表存储检查结果
    CREATE TEMPORARY TABLE temp_consistency_check (
        check_type VARCHAR(100),
        table_name VARCHAR(50),
        record_id VARCHAR(191),
        issue_description TEXT,
        expected_amount DECIMAL(10,2),
        actual_amount DECIMAL(10,2)
    );
    
    -- 1. 检查采购记录与财务记录的一致性
    INSERT INTO temp_consistency_check
    SELECT 
        'purchase_financial_mismatch' as check_type,
        'purchases' as table_name,
        p.id as record_id,
        CONCAT('采购记录总价与财务记录不匹配 - 采购编号: ', p.purchase_code) as issue_description,
        p.total_price as expected_amount,
        COALESCE(SUM(fr.amount), 0) as actual_amount
    FROM purchases p
    LEFT JOIN financial_records fr ON fr.reference_id = p.id AND fr.reference_type = 'PURCHASE'
    GROUP BY p.id, p.total_price, p.purchase_code
    HAVING ABS(p.total_price - COALESCE(SUM(fr.amount), 0)) > 0.01;
    
    -- 2. 检查SKU销售记录与财务记录的一致性
    INSERT INTO temp_consistency_check
    SELECT 
        'sku_sale_financial_mismatch' as check_type,
        'customer_purchases' as table_name,
        cp.id as record_id,
        CONCAT('SKU销售记录与财务记录不匹配 - SKU: ', cp.sku_name) as issue_description,
        cp.total_price as expected_amount,
        COALESCE(SUM(fr.amount), 0) as actual_amount
    FROM customer_purchases cp
    LEFT JOIN financial_records fr ON fr.reference_id = cp.id AND fr.reference_type = 'SKU_SALE'
    WHERE cp.status = 'ACTIVE'
    GROUP BY cp.id, cp.total_price, cp.sku_name
    HAVING ABS(cp.total_price - COALESCE(SUM(fr.amount), 0)) > 0.01;
    
    -- 3. 检查退货记录与财务记录的一致性
    INSERT INTO temp_consistency_check
    SELECT 
        'refund_financial_mismatch' as check_type,
        'customer_purchases' as table_name,
        cp.id as record_id,
        CONCAT('退货记录与财务记录不匹配 - SKU: ', cp.sku_name) as issue_description,
        cp.total_price as expected_amount,
        COALESCE(SUM(fr.amount), 0) as actual_amount
    FROM customer_purchases cp
    LEFT JOIN financial_records fr ON fr.reference_id = cp.id AND fr.reference_type = 'CUSTOMER_REFUND'
    WHERE cp.status = 'REFUNDED'
    GROUP BY cp.id, cp.total_price, cp.sku_name
    HAVING ABS(cp.total_price - COALESCE(SUM(fr.amount), 0)) > 0.01;
    
    -- 4. 检查SKU制作成本与财务记录的一致性
    INSERT INTO temp_consistency_check
    SELECT 
        'sku_cost_financial_mismatch' as check_type,
        'product_skus' as table_name,
        ps.id as record_id,
        CONCAT('SKU制作成本与财务记录不匹配 - SKU: ', ps.sku_name) as issue_description,
        (COALESCE(ps.material_cost, 0) + COALESCE(ps.labor_cost, 0) + COALESCE(ps.craft_cost, 0)) as expected_amount,
        COALESCE(SUM(fr.amount), 0) as actual_amount
    FROM product_skus ps
    LEFT JOIN financial_records fr ON fr.reference_id = ps.id AND fr.reference_type = 'SKU_PRODUCTION'
    GROUP BY ps.id, ps.sku_name, ps.material_cost, ps.labor_cost, ps.craft_cost
    HAVING ABS((COALESCE(ps.material_cost, 0) + COALESCE(ps.labor_cost, 0) + COALESCE(ps.craft_cost, 0)) - COALESCE(SUM(fr.amount), 0)) > 0.01;
    
    -- 统计不一致记录数量
    SELECT COUNT(*) INTO inconsistency_count FROM temp_consistency_check;
    
    -- 返回检查结果
    IF inconsistency_count > 0 THEN
        SELECT 
            check_type,
            table_name,
            record_id,
            issue_description,
            expected_amount,
            actual_amount,
            ABS(expected_amount - actual_amount) as difference_amount
        FROM temp_consistency_check
        ORDER BY check_type, difference_amount DESC;
        
        -- 记录检查结果到同步日志
        INSERT INTO financial_sync_logs (
            id,
            sync_type,
            reference_table,
            reference_id,
            sync_status,
            error_message,
            sync_data
        )
        SELECT 
            CONCAT('consistency_check_', UUID()),
            'data_consistency_check',
            'system',
            'consistency_check',
            'FAILED',
            CONCAT('发现 ', inconsistency_count, ' 个数据不一致问题'),
            JSON_OBJECT(
                'inconsistency_count', inconsistency_count,
                'check_time', NOW(),
                'check_details', 'See temp_consistency_check table for details'
            )
        FROM dual;
    ELSE
        -- 记录检查通过
        INSERT INTO financial_sync_logs (
            id,
            sync_type,
            reference_table,
            reference_id,
            sync_status,
            sync_data
        ) VALUES (
            CONCAT('consistency_check_', UUID()),
            'data_consistency_check',
            'system',
            'consistency_check',
            'SUCCESS',
            JSON_OBJECT(
                'inconsistency_count', 0,
                'check_time', NOW(),
                'message', '所有财务数据一致性检查通过'
            )
        );
        
        SELECT '所有财务数据一致性检查通过' as result;
    END IF;
    
    -- 清理临时表
    DROP TEMPORARY TABLE temp_consistency_check;
END;