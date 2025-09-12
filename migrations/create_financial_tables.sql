-- 财务管理模块数据库表创建脚本
-- 创建时间：2024-01-31
-- 说明：包含财务记录表和退货记录表

USE shuijing_erp;

-- 财务记录表
CREATE TABLE financialRecords (
  id VARCHAR(36) PRIMARY KEY,
  recordType ENUM('INCOME', 'EXPENSE', 'REFUND', 'LOSS') NOT NULL COMMENT '记录类型：收入、支出、退款、损耗',
  amount DECIMAL(10,2) NOT NULL COMMENT '金额',
  description VARCHAR(500) NOT NULL COMMENT '描述',
  referenceType ENUM('PURCHASE', 'SALE', 'REFUND', 'MANUAL') NOT NULL COMMENT '关联类型：采购、销售、退货、手动',
  referenceId VARCHAR(36) COMMENT '关联记录ID',
  category VARCHAR(100) COMMENT '分类',
  transactionDate TIMESTAMP NOT NULL COMMENT '交易日期',
  notes TEXT COMMENT '备注',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  userId VARCHAR(36) NOT NULL COMMENT '操作用户ID',
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_financial_records_record_type (recordType),
  INDEX idx_financial_records_reference (referenceType, referenceId),
  INDEX idx_financial_records_transaction_date (transactionDate DESC),
  INDEX idx_financial_records_user_id (userId),
  INDEX idx_financial_records_created_at (createdAt DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='财务记录表';

-- 退货记录表
CREATE TABLE refundRecords (
  id VARCHAR(36) PRIMARY KEY,
  saleRecordId VARCHAR(36) COMMENT '销售记录ID',
  skuId VARCHAR(36) COMMENT 'SKU ID',
  customerName VARCHAR(100) COMMENT '客户姓名',
  customerContact VARCHAR(100) COMMENT '客户联系方式',
  refundAmount DECIMAL(10,2) NOT NULL COMMENT '退款金额',
  lossAmount DECIMAL(10,2) DEFAULT 20.00 COMMENT '损耗金额',
  reason TEXT COMMENT '退货原因',
  refundDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '退货日期',
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED') DEFAULT 'PENDING' COMMENT '退货状态',
  notes TEXT COMMENT '备注',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  userId VARCHAR(36) NOT NULL COMMENT '操作用户ID',
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (saleRecordId) REFERENCES sales_records(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (skuId) REFERENCES product_skus(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_refund_records_sale_record_id (saleRecordId),
  INDEX idx_refund_records_sku_id (skuId),
  INDEX idx_refund_records_refund_date (refundDate DESC),
  INDEX idx_refund_records_status (status),
  INDEX idx_refund_records_user_id (userId),
  INDEX idx_refund_records_created_at (createdAt DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退货记录表';

-- 财务统计视图
CREATE VIEW financialSummary AS
SELECT 
  DATE(transactionDate) as date,
  SUM(CASE WHEN recordType = 'INCOME' THEN amount ELSE 0 END) as totalIncome,
  SUM(CASE WHEN recordType = 'EXPENSE' THEN amount ELSE 0 END) as totalExpense,
  SUM(CASE WHEN recordType = 'REFUND' THEN amount ELSE 0 END) as totalRefund,
  SUM(CASE WHEN recordType = 'LOSS' THEN amount ELSE 0 END) as totalLoss,
  SUM(CASE WHEN recordType = 'INCOME' THEN amount ELSE 0 END) - 
  SUM(CASE WHEN recordType = 'EXPENSE' THEN amount ELSE 0 END) - 
  SUM(CASE WHEN recordType = 'REFUND' THEN amount ELSE 0 END) - 
  SUM(CASE WHEN recordType = 'LOSS' THEN amount ELSE 0 END) as netProfit
FROM financialRecords
GROUP BY DATE(transactionDate)
ORDER BY date DESC;

-- 月度财务统计视图
CREATE VIEW monthlyFinancialSummary AS
SELECT 
  YEAR(transactionDate) as year,
  MONTH(transactionDate) as month,
  DATE_FORMAT(transactionDate, '%Y-%m') as yearMonth,
  SUM(CASE WHEN recordType = 'INCOME' THEN amount ELSE 0 END) as totalIncome,
  SUM(CASE WHEN recordType = 'EXPENSE' THEN amount ELSE 0 END) as totalExpense,
  SUM(CASE WHEN recordType = 'REFUND' THEN amount ELSE 0 END) as totalRefund,
  SUM(CASE WHEN recordType = 'LOSS' THEN amount ELSE 0 END) as totalLoss,
  SUM(CASE WHEN recordType = 'INCOME' THEN amount ELSE 0 END) - 
  SUM(CASE WHEN recordType = 'EXPENSE' THEN amount ELSE 0 END) - 
  SUM(CASE WHEN recordType = 'REFUND' THEN amount ELSE 0 END) - 
  SUM(CASE WHEN recordType = 'LOSS' THEN amount ELSE 0 END) as netProfit
FROM financialRecords
GROUP BY YEAR(transactionDate), MONTH(transactionDate)
ORDER BY year DESC, month DESC;

-- 插入系统配置
INSERT INTO system_configs (id, `key`, value, description) VALUES
(UUID(), 'default_refund_loss', '20.00', '默认退货损耗金额'),
(UUID(), 'financial_record_prefix', 'FIN', '财务记录编号前缀'),
(UUID(), 'refund_record_prefix', 'REF', '退货记录编号前缀');

COMMIT;