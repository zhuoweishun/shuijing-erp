-- 为客户购买记录表添加状态字段
ALTER TABLE customer_purchases 
ADD COLUMN status ENUM('ACTIVE', 'REFUNDED') DEFAULT 'ACTIVE' AFTER total_price,
ADD COLUMN refundDate DATETIME NULL AFTER status,
ADD COLUMN refundReason VARCHAR(255) NULL AFTER refundDate,
ADD COLUMN refundNotes TEXT NULL AFTER refundReason;

-- 添加索引
CREATE INDEX idx_customer_purchases_status ON customer_purchases(status);
CREATE INDEX idx_customer_purchases_refund_date ON customer_purchases(refundDate);

-- 更新现有记录为ACTIVE状态
UPDATE customer_purchases SET status = 'ACTIVE' WHERE status IS NULL;