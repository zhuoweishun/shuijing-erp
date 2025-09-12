-- 为客户表添加完整的统计字段和标签字段，减少前端计算压力
-- 创建时间: 2025-01-06
-- 描述: 添加总订单数、退货统计、客户标签、客单价等字段

ALTER TABLE customers 
-- 订单统计字段
ADD COLUMN totalAllOrders INT DEFAULT 0 COMMENT '总订单数（包含退货）' AFTER totalOrders,
ADD COLUMN refundCount INT DEFAULT 0 COMMENT '退货次数' AFTER totalAllOrders,
ADD COLUMN refundRate DECIMAL(5,2) DEFAULT 0 COMMENT '退货率（百分比）' AFTER refundCount,

-- 客户价值分析字段
ADD COLUMN averageOrderValue DECIMAL(10,2) DEFAULT 0 COMMENT '平均客单价' AFTER refundRate,
ADD COLUMN daysSinceLastPurchase INT DEFAULT NULL COMMENT '距离最后购买天数' AFTER averageOrderValue,
ADD COLUMN daysSinceFirstPurchase INT DEFAULT NULL COMMENT '距离首次购买天数' AFTER daysSinceLastPurchase,

-- 客户标签字段（JSON格式存储多个标签）
ADD COLUMN customerLabels JSON DEFAULT NULL COMMENT '客户标签数组（如：["VIP","REPEAT","HIGH_VALUE"]）' AFTER daysSinceFirstPurchase,
ADD COLUMN primaryLabel VARCHAR(50) DEFAULT NULL COMMENT '主要客户标签（用于快速筛选）' AFTER customerLabels,

-- 地理位置字段
ADD COLUMN city VARCHAR(50) DEFAULT NULL COMMENT '所在城市（从地址提取）' AFTER primaryLabel,
ADD COLUMN province VARCHAR(50) DEFAULT NULL COMMENT '所在省份（从地址提取）' AFTER city;

-- 添加索引以提高查询性能
ALTER TABLE customers 
ADD INDEX idx_customers_totalAllOrders (totalAllOrders),
ADD INDEX idx_customers_refundCount (refundCount),
ADD INDEX idx_customers_refundRate (refundRate),
ADD INDEX idx_customers_averageOrderValue (averageOrderValue),
ADD INDEX idx_customers_daysSinceLastPurchase (daysSinceLastPurchase),
ADD INDEX idx_customers_primaryLabel (primaryLabel),
ADD INDEX idx_customers_city (city),
ADD INDEX idx_customers_province (province);

-- 更新现有数据的统计字段
UPDATE customers c
SET 
  -- 总订单数（包含所有状态）
  totalAllOrders = (
    SELECT COUNT(*) 
    FROM customer_purchases cp 
    WHERE cp.customerId = c.id
  ),
  
  -- 退货次数
  refundCount = (
    SELECT COUNT(*) 
    FROM customer_purchases cp 
    WHERE cp.customerId = c.id AND cp.status = 'REFUNDED'
  ),
  
  -- 退货率
  refundRate = (
    SELECT 
      CASE 
        WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND((SUM(CASE WHEN status = 'REFUNDED' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2)
      END
    FROM customer_purchases cp 
    WHERE cp.customerId = c.id
  ),
  
  -- 有效订单数（只包含ACTIVE状态）
  totalOrders = (
    SELECT COUNT(*) 
    FROM customer_purchases cp 
    WHERE cp.customerId = c.id AND cp.status = 'ACTIVE'
  ),
  
  -- 累计消费金额（只包含ACTIVE状态）
  totalPurchases = (
    SELECT COALESCE(SUM(total_price), 0) 
    FROM customer_purchases cp 
    WHERE cp.customerId = c.id AND cp.status = 'ACTIVE'
  ),
  
  -- 平均客单价
  averageOrderValue = (
    SELECT 
      CASE 
        WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND(SUM(total_price) / COUNT(*), 2)
      END
    FROM customer_purchases cp 
    WHERE cp.customerId = c.id AND cp.status = 'ACTIVE'
  ),
  
  -- 距离最后购买天数
  daysSinceLastPurchase = (
    SELECT 
      CASE 
        WHEN MAX(purchaseDate) IS NULL THEN NULL
        ELSE DATEDIFF(NOW(), MAX(purchaseDate))
      END
    FROM customer_purchases cp 
    WHERE cp.customerId = c.id AND cp.status = 'ACTIVE'
  ),
  
  -- 距离首次购买天数
  daysSinceFirstPurchase = (
    SELECT 
      CASE 
        WHEN MIN(purchaseDate) IS NULL THEN NULL
        ELSE DATEDIFF(NOW(), MIN(purchaseDate))
      END
    FROM customer_purchases cp 
    WHERE cp.customerId = c.id AND cp.status = 'ACTIVE'
  );

-- 提取城市和省份信息（简单的正则匹配）
UPDATE customers 
SET 
  city = CASE 
    WHEN address REGEXP '([^省]+省)?([^市]+市)' THEN 
      SUBSTRING_INDEX(SUBSTRING_INDEX(address, '市', 1), '省', -1)
    WHEN address REGEXP '(北京|上海|天津|重庆)' THEN 
      SUBSTRING(address, LOCATE(SUBSTRING_INDEX(address, '市', 1), address), LENGTH(SUBSTRING_INDEX(address, '市', 1)))
    ELSE '未知'
  END,
  province = CASE 
    WHEN address REGEXP '([^省]+省)' THEN 
      CONCAT(SUBSTRING_INDEX(address, '省', 1), '省')
    WHEN address REGEXP '(北京|上海|天津|重庆)' THEN 
      SUBSTRING_INDEX(address, '市', 1)
    ELSE '未知'
  END
WHERE address IS NOT NULL AND address != '';

-- 验证数据更新结果
SELECT 
  name as '客户姓名',
  totalOrders as '有效订单',
  totalAllOrders as '总订单',
  refundCount as '退货次数',
  refundRate as '退货率%',
  averageOrderValue as '客单价',
  daysSinceLastPurchase as '距上次购买天数',
  city as '城市',
  totalPurchases as '累计消费'
FROM customers 
WHERE totalAllOrders > 0
ORDER BY totalPurchases DESC
LIMIT 10;

-- 显示城市分布统计
SELECT 
  city as '城市',
  COUNT(*) as '客户数量',
  SUM(totalPurchases) as '总消费金额',
  AVG(averageOrderValue) as '平均客单价'
FROM customers 
WHERE city IS NOT NULL AND city != '未知'
GROUP BY city
ORDER BY COUNT(*) DESC
LIMIT 10;