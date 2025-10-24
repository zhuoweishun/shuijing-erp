-- 为FinancialRecords表添加新字段以支持财务管理系统重构
-- 添加业务操作类型、业务日期、元数据字段，并完善索引设计

-- 添加新字段
ALTER TABLE `financial_records` 
ADD COLUMN `business_operation` VARCHAR(50) NULL COMMENT '业务操作类型：PURCHASE_CREATE, PURCHASE_UPDATE, SKU_MAKE_MATERIAL, SKU_MAKE_LABOR, SKU_MAKE_CRAFT, SKU_SALE, SKU_DESTROY, CUSTOMER_REFUND',
ADD COLUMN `business_date` DATE NULL COMMENT '业务发生日期',
ADD COLUMN `metadata` JSON NULL COMMENT '元数据信息，存储业务相关的详细信息';

-- 添加新的索引以优化查询性能
CREATE INDEX `idx_financial_records_business_operation` ON `financial_records` (`business_operation`);
CREATE INDEX `idx_financial_records_business_date` ON `financial_records` (`business_date`);
CREATE INDEX `idx_financial_records_business_combo` ON `financial_records` (`business_operation`, `business_date`);
CREATE INDEX `idx_financial_records_record_type_business` ON `financial_records` (`record_type`, `business_operation`);

-- 添加复合索引以支持财务统计查询
CREATE INDEX `idx_financial_records_stats` ON `financial_records` (`business_date`, `record_type`, `business_operation`);
CREATE INDEX `idx_financial_records_reference_business` ON `financial_records` (`reference_type`, `reference_id`, `business_operation`);

-- 更新现有记录的business_operation字段（基于reference_type推断）
UPDATE `financial_records` 
SET `business_operation` = CASE 
    WHEN `reference_type` = 'PURCHASE' AND `record_type` = 'EXPENSE' THEN 'PURCHASE_CREATE'
    WHEN `reference_type` = 'SALE' AND `record_type` = 'INCOME' THEN 'SKU_SALE'
    WHEN `reference_type` = 'REFUND' AND `record_type` = 'REFUND' THEN 'CUSTOMER_REFUND'
    WHEN `reference_type` = 'MANUAL' THEN 'MANUAL_ENTRY'
    ELSE 'UNKNOWN'
END,
`business_date` = DATE(`transaction_date`)
WHERE `business_operation` IS NULL;

-- 添加注释说明
ALTER TABLE `financial_records` 
MODIFY COLUMN `business_operation` VARCHAR(50) NULL COMMENT '业务操作类型：PURCHASE_CREATE(采购录入), PURCHASE_UPDATE(采购调整), SKU_MAKE_MATERIAL(SKU制作-原材料), SKU_MAKE_LABOR(SKU制作-人工费), SKU_MAKE_CRAFT(SKU制作-工艺费), SKU_SALE(SKU销售), SKU_DESTROY(SKU销毁), CUSTOMER_REFUND(客户退货)',
MODIFY COLUMN `business_date` DATE NULL COMMENT '业务发生日期，用于财务统计和报表',
MODIFY COLUMN `metadata` JSON NULL COMMENT '元数据信息，存储业务相关的详细信息，如原材料明细、工艺参数等';