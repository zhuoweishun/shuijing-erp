-- 水晶ERP系统 MySQL数据库初始化脚本
-- 请在宝塔面板的phpMyAdmin中执行此脚本

-- 设置字符集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ================================
-- 用户配置表
-- ================================
CREATE TABLE IF NOT EXISTS `user_profiles` (
  `id` varchar(36) NOT NULL COMMENT '用户ID',
  `username` varchar(50) NOT NULL COMMENT '用户名',
  `email` varchar(100) NOT NULL COMMENT '邮箱',
  `full_name` varchar(100) DEFAULT NULL COMMENT '真实姓名',
  `role` enum('admin','user') DEFAULT 'user' COMMENT '用户角色',
  `password_hash` varchar(255) NOT NULL COMMENT '密码哈希',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户配置表';

-- ================================
-- 采购记录表
-- ================================
CREATE TABLE IF NOT EXISTS `purchases` (
  `id` varchar(36) NOT NULL COMMENT '采购记录ID',
  `supplier` varchar(100) NOT NULL COMMENT '供应商',
  `crystal_type` varchar(100) NOT NULL COMMENT '水晶类型',
  `weight` decimal(10,3) NOT NULL COMMENT '重量(克)',
  `price` decimal(10,2) NOT NULL COMMENT '价格(元)',
  `quality` varchar(50) DEFAULT '未知' COMMENT '品质等级',
  `notes` text COMMENT '备注',
  `photos` json DEFAULT NULL COMMENT '照片JSON数组',
  `quantity` int DEFAULT NULL COMMENT '数量',
  `size` varchar(50) DEFAULT NULL COMMENT '尺寸',
  `unit_price` decimal(10,2) DEFAULT NULL COMMENT '单价',
  `bead_price` decimal(10,2) DEFAULT NULL COMMENT '珠子价格',
  `estimated_bead_count` int DEFAULT NULL COMMENT '预估珠子数量',
  `user_id` varchar(36) DEFAULT NULL COMMENT '用户ID',
  `created_by` varchar(50) DEFAULT NULL COMMENT '创建者',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_supplier` (`supplier`),
  KEY `idx_crystal_type` (`crystal_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='采购记录表';

-- ================================
-- 产品记录表
-- ================================
CREATE TABLE IF NOT EXISTS `products` (
  `id` varchar(36) NOT NULL COMMENT '产品ID',
  `product_name` varchar(100) NOT NULL COMMENT '产品名称',
  `category` varchar(50) DEFAULT NULL COMMENT '产品分类',
  `raw_material` varchar(100) DEFAULT NULL COMMENT '原材料',
  `weight` decimal(10,3) DEFAULT NULL COMMENT '重量(克)',
  `size` varchar(50) DEFAULT NULL COMMENT '尺寸',
  `craft_time` int DEFAULT NULL COMMENT '制作时间(小时)',
  `cost` decimal(10,2) DEFAULT NULL COMMENT '成本(元)',
  `selling_price` decimal(10,2) DEFAULT NULL COMMENT '售价(元)',
  `description` text COMMENT '产品描述',
  `photos` json DEFAULT NULL COMMENT '照片JSON数组',
  `status` varchar(20) DEFAULT '制作中' COMMENT '状态',
  `user_id` varchar(36) DEFAULT NULL COMMENT '用户ID',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_category` (`category`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品记录表';

-- ================================
-- 插入默认管理员用户
-- ================================
-- 密码: admin123 (请在生产环境中修改)
INSERT INTO `user_profiles` (`id`, `username`, `email`, `full_name`, `role`, `password_hash`) VALUES
('admin-001', 'admin', 'admin@shuijing.com', '系统管理员', 'admin', '$2b$10$rOzJqQZJqQZJqQZJqQZJqO7K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8');

-- ================================
-- 插入示例数据
-- ================================
-- 示例采购记录
INSERT INTO `purchases` (`id`, `supplier`, `crystal_type`, `weight`, `price`, `quality`, `notes`, `created_by`) VALUES
('purchase-001', '张三水晶店', '紫水晶', 150.500, 280.00, '优质', '颜色纯正，透明度高', 'admin'),
('purchase-002', '李四珠宝', '白水晶', 200.000, 150.00, '普通', '有少量杂质', 'admin');

-- 示例产品记录
INSERT INTO `products` (`id`, `product_name`, `category`, `raw_material`, `weight`, `cost`, `selling_price`, `status`) VALUES
('product-001', '紫水晶手链', '手链', '紫水晶', 25.500, 50.00, 120.00, '已完成'),
('product-002', '白水晶吊坠', '吊坠', '白水晶', 15.200, 30.00, 80.00, '制作中');

-- 重新启用外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- 执行完成提示
SELECT '数据库初始化完成！' AS message;
SELECT COUNT(*) AS user_count FROM user_profiles;
SELECT COUNT(*) AS purchase_count FROM purchases;
SELECT COUNT(*) AS product_count FROM products;