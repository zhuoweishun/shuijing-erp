-- 添加产品类型和计量单位字段到采购表
-- 这个迁移脚本将为采购表添加新的产品分类功能

-- 首先添加枚举类型
ALTER TABLE purchases 
ADD COLUMN productType ENUM('LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED') NOT NULL DEFAULT 'BRACELET' COMMENT '产品类型：散珠/手串/饰品配件/成品';

ALTER TABLE purchases 
ADD COLUMN unitType ENUM('PIECES', 'STRINGS', 'SLICES', 'ITEMS') NOT NULL DEFAULT 'STRINGS' COMMENT '计量单位：颗/条/片/件';

-- 添加新的规格和数量字段
ALTER TABLE purchases 
ADD COLUMN specification DECIMAL(10,1) NULL COMMENT '规格：散珠直径/饰品配件使用边规格/成品平均直径(mm)';

ALTER TABLE purchases 
ADD COLUMN pieceCount INT NULL COMMENT '数量：散珠颗数/饰品配件片数/成品件数';

-- 修改beadDiameter字段为可选（因为饰品配件和成品不需要此字段）
ALTER TABLE purchases 
MODIFY COLUMN beadDiameter DECIMAL(10,1) NULL COMMENT '单珠直径（毫米），散珠和手串必填';

-- 为现有数据设置默认值
-- 所有现有记录都设置为手串类型，并将beadDiameter复制到specification字段
UPDATE purchases 
SET 
  productType = 'BRACELET',
  unitType = 'STRINGS',
  specification = beadDiameter
WHERE productType IS NULL OR unitType IS NULL;

-- 为新字段添加索引以提升查询性能
CREATE INDEX idx_purchases_product_type ON purchases(productType);
CREATE INDEX idx_purchases_unit_type ON purchases(unitType);
CREATE INDEX idx_purchases_specification ON purchases(specification);
CREATE INDEX idx_purchases_piece_count ON purchases(pieceCount);

-- 添加注释说明
ALTER TABLE purchases COMMENT = '采购表 - 支持多种产品类型：散珠、手串、饰品配件、成品';