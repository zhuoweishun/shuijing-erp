-- 创建库存视图
-- 基于采购记录和使用记录实时计算库存数据

-- 创建库存视图
CREATE OR REPLACE VIEW inventory_view AS
SELECT 
    p.id as purchase_id,
    p.productName as product_name,
    CONCAT(p.productName, ' ', p.beadDiameter, 'mm ', COALESCE(p.quality, ''), '级') as bead_type,
    p.beadDiameter as bead_diameter,
    p.quality,
    p.minStockAlert as min_stock_alert,
    p.totalBeads as original_beads,
    COALESCE(SUM(mu.quantityUsedBeads), 0) as used_beads,
    (p.totalBeads - COALESCE(SUM(mu.quantityUsedBeads), 0)) as remaining_beads,
    -- 低库存预警标记
    CASE 
        WHEN p.minStockAlert IS NOT NULL AND 
             (p.totalBeads - COALESCE(SUM(mu.quantityUsedBeads), 0)) <= p.minStockAlert 
        THEN 1 
        ELSE 0 
    END as is_low_stock,
    p.pricePerBead as price_per_bead,
    p.pricePerGram as price_per_gram,
    s.name as supplier_name,
    p.purchaseDate as purchase_date,
    p.photos,
    p.notes,
    p.createdAt as created_at,
    p.updatedAt as updated_at
FROM purchases p
LEFT JOIN material_usage mu ON p.id = mu.purchaseId
LEFT JOIN suppliers s ON p.supplierId = s.id
WHERE p.beadDiameter IS NOT NULL
GROUP BY p.id, p.productName, p.beadDiameter, p.quality, p.minStockAlert, 
         p.totalBeads, p.pricePerBead, p.pricePerGram, s.name, 
         p.purchaseDate, p.photos, p.notes, p.createdAt, p.updatedAt;