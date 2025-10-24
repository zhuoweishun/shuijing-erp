-- 创建财务同步监控表
CREATE TABLE financial_sync_logs (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL COMMENT '同步类型：purchase_create, purchase_update, sku_create, sku_sale, sku_destroy, customer_refund',
    reference_table VARCHAR(50) NOT NULL COMMENT '关联表名',
    reference_id VARCHAR(191) NOT NULL COMMENT '关联记录ID',
    financial_record_id VARCHAR(191) NULL COMMENT '生成的财务记录ID',
    sync_status ENUM('SUCCESS', 'FAILED', 'PENDING') NOT NULL DEFAULT 'PENDING' COMMENT '同步状态',
    error_message TEXT NULL COMMENT '错误信息',
    sync_data JSON NULL COMMENT '同步数据快照',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_sync_type (sync_type),
    INDEX idx_reference (reference_table, reference_id),
    INDEX idx_sync_status (sync_status),
    INDEX idx_created_at (created_at),
    INDEX idx_financial_record_id (financial_record_id)
) COMMENT='财务同步监控日志表';