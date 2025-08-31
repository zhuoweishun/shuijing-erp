-- 为采购表添加性能优化索引
-- 这些索引将显著提升排序和搜索的性能

-- 为常用排序字段添加索引
CREATE INDEX idx_purchases_purchase_date ON purchases(purchaseDate);
CREATE INDEX idx_purchases_product_name ON purchases(productName);
CREATE INDEX idx_purchases_quantity ON purchases(quantity);
CREATE INDEX idx_purchases_price_per_gram ON purchases(pricePerGram);
CREATE INDEX idx_purchases_total_price ON purchases(totalPrice);
CREATE INDEX idx_purchases_bead_diameter ON purchases(beadDiameter);
CREATE INDEX idx_purchases_quality ON purchases(quality);
CREATE INDEX idx_purchases_created_at ON purchases(createdAt);

-- 为搜索字段添加全文索引（MySQL支持）
CREATE FULLTEXT INDEX idx_purchases_product_name_fulltext ON purchases(productName);

-- 为供应商关联添加索引（如果还没有的话）
CREATE INDEX idx_purchases_supplier_id ON purchases(supplierId);

-- 为用户关联添加索引
CREATE INDEX idx_purchases_user_id ON purchases(userId);

-- 为供应商名称添加索引
CREATE INDEX idx_suppliers_name ON suppliers(name);

-- 复合索引：常用的筛选组合
CREATE INDEX idx_purchases_date_quality ON purchases(purchaseDate, quality);
CREATE INDEX idx_purchases_supplier_date ON purchases(supplierId, purchaseDate);

-- 为分页查询优化的复合索引
CREATE INDEX idx_purchases_created_at_id ON purchases(createdAt, id);